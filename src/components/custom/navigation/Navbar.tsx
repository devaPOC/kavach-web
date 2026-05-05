'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  LogOut,
  User,
  Settings,
  Menu,
  X,
  RefreshCw,
  Clock
} from 'lucide-react'
import { authApi } from '@/lib/api/client'

interface NavbarProps {
  user?: {
    firstName: string
    lastName: string
    email: string
    role: 'customer' | 'expert' | 'trainer' | 'admin'
  }
  showProfileMenu?: boolean
  showLogo?: boolean
}

export default function Navbar({
  user,
  showProfileMenu = true,
  showLogo = true
}: NavbarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  // Session timer state
  const [timeLeft, setTimeLeft] = useState<number>(3600) // Default 60 minutes in seconds

  const router = useRouter()
  const pathname = usePathname()

  // Determine current mode based on pathname
  const isTrainerMode = pathname?.startsWith('/trainer')
  const currentMode = isTrainerMode ? 'Trainer Mode' : 'Expert Mode'

  // Session timer ticker with persistence
  useEffect(() => {
    if (!user) return; // Don't run timer if not logged in

    // 1. Get or Set Expiry Time
    const SESSION_DURATION_SEC = 3600;
    const STORAGE_KEY = 'sessionExpiry';

    let expiryTimestamp = sessionStorage.getItem(STORAGE_KEY);

    // If no expiry or it's in the past (invalid), reset it
    if (!expiryTimestamp || parseInt(expiryTimestamp, 10) < Date.now()) {
      const now = Date.now();
      const expiry = now + (SESSION_DURATION_SEC * 1000);
      sessionStorage.setItem(STORAGE_KEY, expiry.toString());
      expiryTimestamp = expiry.toString();
    }

    const expiry = parseInt(expiryTimestamp, 10);

    // 2. Update timer logic to sync with wall clock
    const updateTimer = () => {
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(secondsLeft);

      if (secondsLeft === 0) {
        // Trigger logout when time is up
        handleLogout();
      }
    };

    // Run immediately to set initial state
    updateTimer();

    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer)
  }, [user]) // Re-run when user changes

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    try {
      const result = await authApi.logout()
      if (result.success) {
        localStorage.removeItem('user')
        sessionStorage.removeItem('sessionExpiry') // Clear timer storage
        router.push('/login')
      } else {
        console.error('Logout failed:', result.error)
        sessionStorage.removeItem('sessionExpiry') // Clear anyway
        router.push('/login')
      }
    } catch (error) {
      console.error('Logout error:', error)
      sessionStorage.removeItem('sessionExpiry') // Clear anyway
      router.push('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleModeSwitch = () => {
    if (isTrainerMode) {
      router.push('/expert/dashboard')
    } else {
      router.push('/trainer/resources')
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'trainer': return 'bg-purple-100 text-purple-800'
      case 'expert': return 'bg-blue-100 text-blue-800'
      case 'customer': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-100 sticky top-0 z-30">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center h-16 ${showLogo ? 'justify-between' : 'justify-end'}`}>
          {/* Brand/Logo */}
          {showLogo && (
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img
                  className="h-8 w-auto"
                  src="/logo.png"
                  alt="Kavach"
                />
              </div>
            </div>
          )}

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center gap-3">
              {user && (
                <>
                  {/* Session Timer */}
                  <div className="flex items-center text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100" title="Session Timeout">
                    <Clock className="h-4 w-4 mr-2 text-amber-500" />
                    <span className="font-mono font-medium text-slate-700">{formatTime(timeLeft)}</span>
                  </div>

                  {/* Profile Menu */}
                  {showProfileMenu && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all duration-200"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-semibold text-white">{user.firstName?.[0]}{user.lastName?.[0]}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700">{user.firstName} {user.lastName}</span>
                      </Button>

                      {isProfileMenuOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg shadow-slate-200/50 ring-1 ring-slate-100 z-50 overflow-hidden">
                          <div className="py-1">
                            {/* User Info in Dropdown */}
                            <div className="px-4 py-3 border-b border-slate-100">
                              <div className="text-sm font-medium text-slate-800">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">{user.email}</div>
                            </div>

                            {/* Mode Switcher for Trainers */}
                            {user.role === 'trainer' && (
                              <button
                                onClick={() => {
                                  setIsProfileMenuOpen(false)
                                  handleModeSwitch()
                                }}
                                className="flex items-center w-full px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 border-b border-slate-100 transition-colors duration-200"
                              >
                                <RefreshCw className="h-4 w-4 mr-3" />
                                Switch to {isTrainerMode ? 'Expert' : 'Trainer'} Mode
                              </button>
                            )}

                            {/* Profile Settings */}
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false)
                                router.push('/profile')
                              }}
                              className="flex items-center w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors duration-200"
                            >
                              <Settings className="h-4 w-4 mr-3" />
                              Profile Settings
                            </button>

                            {/* Logout */}
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false)
                                handleLogout()
                              }}
                              disabled={isLoggingOut}
                              className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors duration-200"
                            >
                              <LogOut className="h-4 w-4 mr-3" />
                              {isLoggingOut ? 'Logging out...' : 'Logout'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-xl hover:bg-slate-50"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-slate-600" />
              ) : (
                <Menu className="h-6 w-6 text-slate-600" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-4 pt-3 pb-4 space-y-3 bg-slate-50/80 backdrop-blur-sm border-t border-slate-100">
            {user && (
              <>
                {/* User Info Mobile */}
                <div className="px-4 py-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-white">{user.firstName?.[0]}{user.lastName?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium text-slate-800 truncate">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-slate-500 truncate">{user.email}</div>
                      {/* Mobile Session Timer */}
                      <div className="flex items-center text-xs text-slate-600 mt-2 bg-slate-50 px-2.5 py-1.5 rounded-lg w-fit border border-slate-100">
                        <Clock className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                        <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Menu Items */}
                {/* Mode Switcher for Trainers (Mobile) */}
                {user.role === 'trainer' && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      handleModeSwitch()
                    }}
                    className="flex items-center w-full px-4 py-3 text-base font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-colors duration-200"
                  >
                    <RefreshCw className="h-5 w-5 mr-3" />
                    Switch to {isTrainerMode ? 'Expert' : 'Trainer'} Mode
                  </button>
                )}

                {showProfileMenu && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      router.push('/profile')
                    }}
                    className="flex items-center w-full px-4 py-3 text-base font-medium text-slate-600 hover:bg-slate-100 bg-white border border-slate-100 rounded-xl transition-colors duration-200"
                  >
                    <Settings className="h-5 w-5 mr-3" />
                    Profile Settings
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center w-full px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 bg-white border border-slate-100 rounded-xl transition-colors duration-200 disabled:opacity-50"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
