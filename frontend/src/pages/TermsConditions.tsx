import React from 'react';
import { FileText, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export const TermsConditions: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Terms and Conditions
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Effective Date: October 2026. Platform Terms of Use and Disclaimer.
        </p>
      </div>

      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#84cc16]" />
            1. Agreement to Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-xs sm:text-sm text-stone-600 dark:text-stone-300 space-y-3 leading-relaxed">
          <p>
            By accessing or using the Nutrition Tracker microservices platform, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you must discontinue using the application immediately.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            2. Medical and Nutritional Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-xs sm:text-sm text-stone-600 dark:text-stone-300 space-y-3 leading-relaxed">
          <p>
            The content, calorie calculations, and nutritional summaries provided by this platform are for informational and tracking purposes only. They do not constitute formal medical diagnosis, treatment advice, or personalized dietary therapy.
          </p>
          <p>
            Always consult a qualified physician or registered dietitian before beginning any radical diet, weight reduction program, or fasting regimen.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#1b3b2b] dark:text-emerald-400" />
            3. Account Responsibilities
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-xs sm:text-sm text-stone-600 dark:text-stone-300 space-y-3 leading-relaxed">
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and JWT tokens. You agree to notify administrators promptly if you suspect any unauthorized access to your account.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            4. Service Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-xs sm:text-sm text-stone-600 dark:text-stone-300 space-y-3 leading-relaxed">
          <p>
            The backend consists of autonomous Spring Boot microservices registered with Netflix Eureka. While service redundancy and client-side load balancing are implemented via Spring Cloud, temporary outages of individual service nodes may occur during maintenance or database synchronization.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
