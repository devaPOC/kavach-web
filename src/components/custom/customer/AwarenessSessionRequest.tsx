'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AwarenessSessionRequestForm } from '@/components/custom/awareness-lab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';
import { type CreateAwarenessSessionData } from '@/lib/validation/awareness-session-schemas';

export function AwarenessSessionRequest() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);
    const [submittedData, setSubmittedData] = useState<CreateAwarenessSessionData | null>(null);

    const handleSubmit = async (data: CreateAwarenessSessionData) => {
        setIsLoading(true);
        setError('');

        try {
            console.log('Data received in component:', data);
            console.log('sessionDate type:', typeof data.sessionDate);
            console.log('sessionDate value:', data.sessionDate);

            // sessionDate is already a string from the validation schema type
            const requestData = {
                ...data,
                sessionDate: data.sessionDate // Already a string
            };

            console.log('Request data being sent:', requestData);
            console.log('Request sessionDate type:', typeof requestData.sessionDate);

            const response = await fetch('/api/v1/awareness-sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setSubmittedData(data);
                setSuccess(true);
            } else {
                throw new Error(result.message || result.error || 'Failed to submit request');
            }
        } catch (err) {
            console.error('Error submitting awareness session request:', err);
            setError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDashboard = () => {
        router.push('/dashboard');
    };

    const handleCreateAnother = () => {
        setSuccess(false);
        setSubmittedData(null);
        setError('');
    };

    if (success && submittedData) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-secondary" />
                            <CardTitle>Request Submitted Successfully!</CardTitle>
                        </div>
                        <CardDescription>
                            Your awareness session request has been submitted and is now pending admin review.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Request Summary:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div><strong>Organization:</strong> {submittedData.organizationName}</div>
                                <div><strong>Session Date:</strong> {new Date(submittedData.sessionDate).toLocaleDateString()}</div>
                                <div><strong>Location:</strong> {submittedData.location}</div>
                                <div><strong>Duration:</strong> {submittedData.duration.replace('_', ' ')}</div>
                                <div><strong>Subject:</strong> {submittedData.subject}</div>
                                <div><strong>Audience Size:</strong> {submittedData.audienceSize}</div>
                                <div><strong>Session Mode:</strong> {submittedData.sessionMode.replace('_', ' ')}</div>
                                <div><strong>Contact Email:</strong> {submittedData.contactEmail}</div>
                            </div>
                            {submittedData.specialRequirements && (
                                <div className="mt-2">
                                    <strong>Special Requirements:</strong>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {submittedData.specialRequirements}
                                    </p>
                                </div>
                            )}
                        </div>

                        <Alert>
                            <AlertDescription>
                                You will receive an email confirmation shortly. Our admin team will review your request
                                and assign an expert within 2-3 business days. You can track the status of your request
                                in your dashboard.
                            </AlertDescription>
                        </Alert>

                        <div className="flex gap-3">
                            <button
                                onClick={handleViewDashboard}
                                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                            >
                                View Dashboard
                            </button>
                            <button
                                onClick={handleCreateAnother}
                                className="flex-1 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                            >
                                Submit Another Request
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold mb-2">Request Awareness Session</h1>
                <p className="text-muted-foreground">
                    Submit a request for a cybersecurity awareness session for your organization
                </p>
            </div>

            <AwarenessSessionRequestForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
                error={error}
            />
        </div>
    );
}