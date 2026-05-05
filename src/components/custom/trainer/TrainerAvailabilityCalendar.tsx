'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Building,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import {
  AwarenessSessionRequestResponse,
  DURATION_LABELS,
  SESSION_MODE_LABELS
} from '@/types/awareness-session'

interface ExpertAvailabilityCalendarProps {
  confirmedSessions: AwarenessSessionRequestResponse[]
  className?: string
}

export default function TrainerAvailabilityCalendar({
  confirmedSessions,
  className
}: ExpertAvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [sessionsForDate, setSessionsForDate] = useState<AwarenessSessionRequestResponse[]>([])

  useEffect(() => {
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0]
      const sessions = confirmedSessions.filter(session => {
        const sessionDate = new Date(session.sessionDate).toISOString().split('T')[0]
        return sessionDate === dateString
      })
      setSessionsForDate(sessions)
    }
  }, [selectedDate, confirmedSessions])

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Get dates that have confirmed sessions
  const sessionDates = confirmedSessions.map(session =>
    new Date(session.sessionDate).toISOString().split('T')[0]
  )

  // Custom day renderer to highlight dates with sessions
  const modifiers = {
    hasSession: (date: Date) => {
      const dateString = date.toISOString().split('T')[0]
      return sessionDates.includes(dateString)
    }
  }

  const modifiersStyles = {
    hasSession: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      fontWeight: 'bold'
    }
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule & Availability</h2>
        <p className="text-gray-600">
          View your confirmed awareness sessions and manage your availability.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendar View
            </CardTitle>
            <CardDescription>
              Dates with confirmed sessions are highlighted in green.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border"
            />

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <span>Dates with confirmed sessions</span>
              </div>
              <div className="text-sm text-gray-600">
                Total confirmed sessions: {confirmedSessions.length}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions for Selected Date */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {selectedDate ? formatDate(selectedDate.toISOString()) : 'Select a Date'}
            </CardTitle>
            <CardDescription>
              {sessionsForDate.length > 0
                ? `${sessionsForDate.length} session${sessionsForDate.length > 1 ? 's' : ''} scheduled`
                : 'No sessions scheduled for this date'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsForDate.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No sessions scheduled for this date</p>
                <p className="text-sm text-gray-500 mt-2">
                  You're available for new session requests on this date.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessionsForDate.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{session.subject}</h4>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {session.organizationName}
                        </p>
                      </div>
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Confirmed
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>{formatTime(session.sessionDate)} - {DURATION_LABELS[session.duration]}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{SESSION_MODE_LABELS[session.sessionMode]} - {session.location}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span>{session.audienceSize} participants</span>
                      </div>
                    </div>

                    {session.expertNotes && (
                      <div className="bg-green-50 p-2 rounded text-sm">
                        <span className="font-medium">Your Notes:</span> {session.expertNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions Summary */}
      {confirmedSessions.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Upcoming Sessions
            </CardTitle>
            <CardDescription>
              Your next confirmed awareness sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {confirmedSessions
                .filter(session => new Date(session.sessionDate) >= new Date())
                .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
                .slice(0, 3)
                .map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{session.subject}</p>
                      <p className="text-sm text-gray-600">{session.organizationName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatDate(session.sessionDate)}</p>
                      <p className="text-xs text-gray-500">{formatTime(session.sessionDate)}</p>
                    </div>
                  </div>
                ))}

              {confirmedSessions.filter(session => new Date(session.sessionDate) >= new Date()).length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-600">No upcoming sessions scheduled</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
