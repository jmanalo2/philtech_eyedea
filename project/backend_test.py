import requests
import sys
import json
from datetime import datetime

class PhiltechEyedeaAPITester:
    def __init__(self, base_url="https://philtech-ideabox.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.approver_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_idea_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}...")

            return success, response.json() if response.text and response.status_code < 500 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_login(self, username, password, role_name):
        """Test login and get token"""
        success, response = self.run_test(
            f"Login as {role_name} ({username})",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'access_token' in response:
            token = response['access_token']
            user_info = response.get('user', {})
            print(f"   User role: {user_info.get('role')}, Department: {user_info.get('department')}")
            return token
        return None

    def test_dashboard_stats(self, token, role_name):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            f"Dashboard Stats ({role_name})",
            "GET",
            "dashboard/stats",
            200,
            token=token
        )
        return success

    def test_get_ideas(self, token, role_name, filters=None):
        """Test get ideas endpoint"""
        endpoint = "ideas"
        if filters:
            params = "&".join([f"{k}={v}" for k, v in filters.items()])
            endpoint = f"ideas?{params}"
        
        success, response = self.run_test(
            f"Get Ideas ({role_name})" + (f" with filters {filters}" if filters else ""),
            "GET",
            endpoint,
            200,
            token=token
        )
        return success, response

    def test_create_idea(self, token):
        """Test create idea endpoint"""
        idea_data = {
            "pillar": "Tech",
            "title": "Test Eye-dea from Testing",
            "improvement_type": "Automation",
            "current_process": "Manual testing process",
            "suggested_solution": "Automated testing framework",
            "benefits": "Save 50% time",
            "target_completion": "Q2 2025",
            "department": "Technology",
            "team": None
        }
        
        success, response = self.run_test(
            "Create New Idea",
            "POST",
            "ideas",
            200,
            data=idea_data,
            token=token
        )
        
        if success and 'id' in response:
            self.created_idea_id = response['id']
            print(f"   Created idea ID: {self.created_idea_id}")
        
        return success, response

    def test_get_idea_detail(self, token, idea_id, role_name):
        """Test get single idea endpoint"""
        success, response = self.run_test(
            f"Get Idea Detail ({role_name})",
            "GET",
            f"ideas/{idea_id}",
            200,
            token=token
        )
        return success, response

    def test_add_comment(self, token, idea_id, role_name):
        """Test add comment to idea"""
        comment_data = {
            "comment_text": f"Test comment from {role_name} - {datetime.now().strftime('%H:%M:%S')}"
        }
        
        success, response = self.run_test(
            f"Add Comment ({role_name})",
            "POST",
            f"ideas/{idea_id}/comments",
            200,
            data=comment_data,
            token=token
        )
        return success

    def test_get_comments(self, token, idea_id, role_name):
        """Test get comments for idea"""
        success, response = self.run_test(
            f"Get Comments ({role_name})",
            "GET",
            f"ideas/{idea_id}/comments",
            200,
            token=token
        )
        return success, response

    def test_request_revision(self, token, idea_id):
        """Test request revision action"""
        action_data = {
            "comment": "Please provide more details about the implementation timeline and resource requirements."
        }
        
        success, response = self.run_test(
            "Request Revision (Approver)",
            "POST",
            f"ideas/{idea_id}/request-revision",
            200,
            data=action_data,
            token=token
        )
        return success

    def test_admin_endpoints(self, token):
        """Test admin-only endpoints"""
        results = []
        
        # Test get users
        success, _ = self.run_test(
            "Admin - Get Users",
            "GET",
            "admin/users",
            200,
            token=token
        )
        results.append(success)
        
        # Test get departments
        success, departments = self.run_test(
            "Admin - Get Departments",
            "GET",
            "admin/departments",
            200,
            token=token
        )
        results.append(success)
        
        # Test create department
        dept_data = {"name": "Test Department"}
        success, dept_response = self.run_test(
            "Admin - Create Department",
            "POST",
            "admin/departments",
            200,
            data=dept_data,
            token=token
        )
        results.append(success)
        
        # Test get pillars
        success, pillars = self.run_test(
            "Admin - Get Pillars",
            "GET",
            "admin/pillars",
            200,
            token=token
        )
        results.append(success)
        
        # Test create pillar
        pillar_data = {"name": "Test Pillar"}
        success, pillar_response = self.run_test(
            "Admin - Create Pillar",
            "POST",
            "admin/pillars",
            200,
            data=pillar_data,
            token=token
        )
        results.append(success)
        
        # Test get teams
        success, teams = self.run_test(
            "Admin - Get Teams",
            "GET",
            "admin/teams",
            200,
            token=token
        )
        results.append(success)
        
        # Test create team (using GBS pillar from seed data)
        team_data = {"name": "Test Team", "pillar": "GBS"}
        success, team_response = self.run_test(
            "Admin - Create Team",
            "POST",
            "admin/teams",
            200,
            data=team_data,
            token=token
        )
        results.append(success)
        
        return all(results)

def main():
    print("🚀 Starting Philtech Eye-dea API Testing...")
    print("=" * 60)
    
    tester = PhiltechEyedeaAPITester()
    
    # Test 1: Health Check
    if not tester.test_health_check():
        print("❌ Health check failed - API may be down")
        return 1
    
    # Test 2: Authentication
    print("\n" + "=" * 60)
    print("🔐 AUTHENTICATION TESTS")
    print("=" * 60)
    
    tester.admin_token = tester.test_login("admin", "admin123", "Admin")
    tester.approver_token = tester.test_login("approver1", "approver123", "Approver")
    tester.user_token = tester.test_login("user1", "user123", "User")
    
    if not all([tester.admin_token, tester.approver_token, tester.user_token]):
        print("❌ Authentication failed for one or more users")
        return 1
    
    # Test 3: Dashboard Stats
    print("\n" + "=" * 60)
    print("📊 DASHBOARD TESTS")
    print("=" * 60)
    
    tester.test_dashboard_stats(tester.admin_token, "Admin")
    tester.test_dashboard_stats(tester.approver_token, "Approver")
    tester.test_dashboard_stats(tester.user_token, "User")
    
    # Test 4: Ideas Management
    print("\n" + "=" * 60)
    print("💡 IDEAS MANAGEMENT TESTS")
    print("=" * 60)
    
    # Get existing ideas
    success, existing_ideas = tester.test_get_ideas(tester.user_token, "User")
    if success and existing_ideas:
        print(f"   Found {len(existing_ideas)} existing ideas")
        sample_idea_id = existing_ideas[0]['id']
    else:
        sample_idea_id = None
    
    # Create new idea
    success, new_idea = tester.test_create_idea(tester.user_token)
    if success:
        idea_id = tester.created_idea_id
    else:
        idea_id = sample_idea_id
    
    if idea_id:
        # Test idea detail
        tester.test_get_idea_detail(tester.user_token, idea_id, "User")
        tester.test_get_idea_detail(tester.approver_token, idea_id, "Approver")
        
        # Test comments
        tester.test_add_comment(tester.user_token, idea_id, "User")
        tester.test_get_comments(tester.user_token, idea_id, "User")
        
        # Test approval workflow
        tester.test_request_revision(tester.approver_token, idea_id)
    
    # Test 5: Filtering
    print("\n" + "=" * 60)
    print("🔍 FILTERING TESTS")
    print("=" * 60)
    
    tester.test_get_ideas(tester.user_token, "User", {"status": "pending"})
    tester.test_get_ideas(tester.user_token, "User", {"pillar": "Tech"})
    tester.test_get_ideas(tester.user_token, "User", {"department": "Operations"})
    
    # Test 6: Admin Functions
    print("\n" + "=" * 60)
    print("👑 ADMIN TESTS")
    print("=" * 60)
    
    tester.test_admin_endpoints(tester.admin_token)
    
    # Final Results
    print("\n" + "=" * 60)
    print("📋 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Total Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed - check logs above")
        return 1

if __name__ == "__main__":
    sys.exit(main())