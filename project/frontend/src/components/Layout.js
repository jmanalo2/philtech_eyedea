import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Menu, X, Home, Lightbulb, UserCog, User, LogOut, BarChart3 } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link to="/dashboard" className="flex items-center space-x-2 sm:space-x-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_idea-gateway/artifacts/pvc8r5o3_IMG_8308.jpeg" 
                alt="Philtech Logo" 
                className="h-8 sm:h-12 w-auto"
              />
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 sm:w-6 sm:h-6 text-blue-700" />
                </div>
                <div className="hidden xs:block">
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Eye-dea</h1>
                  <p className="text-[10px] sm:text-xs text-blue-200 hidden sm:block">Innovation Management</p>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link to="/dashboard">
                <Button
                  data-testid="nav-dashboard-btn"
                  variant={isActive('/dashboard') ? 'secondary' : 'ghost'}
                  className={isActive('/dashboard') ? 'bg-white text-blue-900' : 'text-white hover:bg-blue-800'}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/ideas">
                <Button
                  data-testid="nav-ideas-btn"
                  variant={isActive('/ideas') ? 'secondary' : 'ghost'}
                  className={isActive('/ideas') ? 'bg-white text-blue-900' : 'text-white hover:bg-blue-800'}
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Eye-deas
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin">
                  <Button
                    data-testid="nav-admin-btn"
                    variant={isActive('/admin') ? 'secondary' : 'ghost'}
                    className={isActive('/admin') ? 'bg-white text-blue-900' : 'text-white hover:bg-blue-800'}
                  >
                    <UserCog className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              {(user?.role === 'admin' || (user?.role === 'approver' && user?.sub_role === 'ci_excellence')) && (
                <Link to="/ci-dashboard">
                  <Button
                    data-testid="nav-ci-dashboard-btn"
                    variant={isActive('/ci-dashboard') ? 'secondary' : 'ghost'}
                    className={isActive('/ci-dashboard') ? 'bg-white text-blue-900' : 'text-white hover:bg-blue-800'}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    C.I. Analytics
                  </Button>
                </Link>
              )}
              <Link to="/profile">
                <Button
                  data-testid="nav-profile-btn"
                  variant={isActive('/profile') ? 'secondary' : 'ghost'}
                  className={isActive('/profile') ? 'bg-white text-blue-900' : 'text-white hover:bg-blue-800'}
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Button
                data-testid="logout-btn"
                variant="ghost"
                className="text-white hover:bg-blue-800"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-blue-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 space-y-1 border-t border-blue-600 pt-3" data-testid="mobile-nav">
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-800">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/ideas" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-800">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Eye-deas
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-800">
                    <UserCog className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              {(user?.role === 'admin' || (user?.role === 'approver' && user?.sub_role === 'ci_excellence')) && (
                <Link to="/ci-dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-800">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    C.I. Analytics
                  </Button>
                </Link>
              )}
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-white hover:bg-blue-800">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-blue-800"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}