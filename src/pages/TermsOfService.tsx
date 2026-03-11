import { SEOHead } from '@/components/seo';
import LandingNavbar from '@/components/landing/LandingNavbar';
import FooterSection from '@/components/landing/FooterSection';

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Terms of Service - Brand Kit OS"
        description="Terms and conditions for using Brand Kit OS."
        canonicalUrl="/terms"
      />
      <LandingNavbar />
      <main className="container mx-auto max-w-4xl px-4 pt-24 pb-12">
        <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>
        <p className="mb-8 text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Brand Kit OS, you agree to be bound by these Terms of Service and all applicable 
              laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Brand Kit OS is an AI-native brand kit platform that helps you build, manage, and share your brand 
              across AI tools, agents, and platforms. We provide tools for creating brand guidelines, managing 
              brand assets, and exporting brand kits for use with AI systems.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">When you create an account, you agree to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain all rights to the content you upload to Brand Kit OS. By uploading content, you grant us 
              a license to use, store, and process that content solely for the purpose of providing our services to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Prohibited Uses</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the service for any unlawful purpose</li>
              <li>Upload content that infringes on intellectual property rights</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Use the service to distribute malware or harmful code</li>
              <li>Resell or redistribute our services without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Brand Kit OS service, including its original content, features, and functionality, is owned by 
              Brand Kit OS and is protected by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Payment Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              Certain features of our service may require payment. By subscribing to a paid plan, you agree to pay 
              all applicable fees. Fees are non-refundable except as required by law or as explicitly stated in our refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Brand Kit OS shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages, including loss of profits, data, or other intangible losses 
              resulting from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The service is provided "as is" and "as available" without warranties of any kind, either express or implied. 
              We do not warrant that the service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account and access to the service immediately, without prior notice, 
              for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which 
              Brand Kit OS operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of any material changes 
              by updating the "Last updated" date. Continued use of the service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:support@brandkitos.com" className="text-primary hover:underline">
                support@brandkitos.com
              </a>
            </p>
          </section>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
