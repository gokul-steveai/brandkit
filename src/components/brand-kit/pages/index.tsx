import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PersonalityEditor } from '../personality';
import { CorePage as CorePageComponent } from '../core';
import { ExpressionPage as ExpressionPageComponent } from '../expression';
import { ProductsPage as ProductsPageComponent } from '../products';
import { OverviewPage as OverviewPageComponent } from '../overview';
import { ExportPage as ExportPageComponent } from '../export';
import { KnowledgeFilesPage as KnowledgeFilesPageComponent } from '../knowledge';
import { GovernancePage as GovernancePageComponent } from '../governance';
import { PersonasAudiencePage as PersonasAudiencePageComponent } from '../personas-audience';
import { WebPage as WebPageComponent } from '../web';

export const OverviewPage = () => (
  <ErrorBoundary>
    <OverviewPageComponent />
  </ErrorBoundary>
);

export const CorePage = () => (
  <ErrorBoundary>
    <CorePageComponent />
  </ErrorBoundary>
);

export const PersonalityPage = () => (
  <ErrorBoundary>
    <PersonalityEditor />
  </ErrorBoundary>
);

export const ExpressionPage = () => (
  <ErrorBoundary>
    <ExpressionPageComponent />
  </ErrorBoundary>
);

export const ProductsPage = () => (
  <ErrorBoundary>
    <ProductsPageComponent />
  </ErrorBoundary>
);

export const GovernancePage = () => (
  <ErrorBoundary>
    <GovernancePageComponent />
  </ErrorBoundary>
);

export const ExportPage = () => (
  <ErrorBoundary>
    <ExportPageComponent />
  </ErrorBoundary>
);

export const KnowledgeFilesPage = () => (
  <ErrorBoundary>
    <KnowledgeFilesPageComponent />
  </ErrorBoundary>
);

export const PersonasAudiencePage = () => (
  <ErrorBoundary>
    <PersonasAudiencePageComponent />
  </ErrorBoundary>
);

export const WebPage = () => (
  <ErrorBoundary>
    <WebPageComponent />
  </ErrorBoundary>
);
