import React from 'react';
import { ShieldCheck, Lock, Eye, Database, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Privacy Policy
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Effective Date: October 2026. Microservices Platform Data Protection Guidelines.
        </p>
      </div>

      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#84cc16]" />
            1. Overview and Scope
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-xs sm:text-sm text-stone-600 dark:text-stone-300 space-y-3 leading-relaxed">
          <p>
            The Nutrition Tracker application is committed to protecting user biometrics, meal plans, and account credentials. This policy outlines how information is stored, processed, and safeguarded across our microservices architecture.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-[#1b3b2b] dark:text-emerald-400" />
            2. Information We Collect
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-xs sm:text-sm text-stone-600 dark:text-stone-300 space-y-3 leading-relaxed">
          <p>
            Our backend microservices store specific data items required for nutrition calculations:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Account Information:</strong> Name, email address, and hashed passwords managed by the User Profile Service.
            </li>
            <li>
              <strong>Biometric Profile:</strong> Age, weight in kilograms, height in centimeters, and declared activity level.
            </li>
            <li>
              <strong>Nutritional Preferences:</strong> Dietary flags (vegan, vegetarian, keto, gluten-free, dairy-free) and user-declared allergy records.
            </li>
            <li>
              <strong>Meal and Grocery Records:</strong> Daily food consumption logs and grocery shopping checklists managed by MongoDB microservices.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            3. Security and Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-xs sm:text-sm text-stone-600 dark:text-stone-300 space-y-3 leading-relaxed">
          <p>
            All user sessions are secured using industry-standard JSON Web Tokens (JWT). Client requests travel strictly through our Spring Cloud API Gateway (port 8088), where authorization tokens are forwarded to internal microservices. Passwords are never stored in plaintext and are salted and hashed using BCrypt.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            4. Service Isolation and Third Parties
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-xs sm:text-sm text-stone-600 dark:text-stone-300 space-y-3 leading-relaxed">
          <p>
            Data is stored strictly in isolated database instances (relational MySQL for profiles and MongoDB Atlas for master foods, meal plans, and grocery lists). We do not sell, rent, or distribute personal information to third-party advertising brokers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
