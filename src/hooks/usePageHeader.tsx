import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PageHeaderInfo {
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  };
}

interface PageHeaderContextType {
  headerInfo: PageHeaderInfo | null;
  setHeaderInfo: (info: PageHeaderInfo | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [headerInfo, setHeaderInfo] = useState<PageHeaderInfo | null>(null);

  return (
    <PageHeaderContext.Provider value={{ headerInfo, setHeaderInfo }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (!context) {
    throw new Error('usePageHeader must be used within a PageHeaderProvider');
  }
  return context;
}

export function useSetPageHeader(info: PageHeaderInfo | null) {
  const { setHeaderInfo } = usePageHeader();
  
  // Effect-based setter that cleans up on unmount
  const setHeader = useCallback(() => {
    setHeaderInfo(info);
    return () => setHeaderInfo(null);
  }, [info, setHeaderInfo]);

  return setHeader;
}
