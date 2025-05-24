import React, { createContext, useContext, useState } from 'react';

type AnalysisContextType = {
  requestJson: any;
  setRequestJson: (json: any) => void;
  system: string;
  setSystem: (sys: string) => void;
  results: any;
  setResults: (res: any) => void;
};

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requestJson, setRequestJson] = useState<any | null>(null);
  const [system, setSystem] = useState<string>('BSS');
  const [results, setResults] = useState<any | null>(null);

  return (
    <AnalysisContext.Provider value={{ requestJson, setRequestJson, system, setSystem, results, setResults }}>
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysisContext = () => {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysisContext must be used inside <AnalysisProvider>');
  return ctx;
};
