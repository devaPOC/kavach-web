'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuizManager from './QuizManager';
import TemplateManager from './TemplateManager';
import MaterialsManager from './MaterialsManager';
import AdminAwarenessSessionDashboard from './AdminAwarenessSessionDashboard';

export default function AdminAwarenessLab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-gray-900">Awareness Lab</h3>
        <p className="text-gray-600">Manage awareness sessions, quizzes, templates, and learning materials.</p>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6">
          <AdminAwarenessSessionDashboard />
        </TabsContent>

        <TabsContent value="quizzes" className="mt-6">
          <QuizManager />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
           <TemplateManager />
        </TabsContent>

        <TabsContent value="materials" className="mt-6">
           <MaterialsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
