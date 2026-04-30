import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface BrandAssets {
  logo: string;
  favicon: string;
  ogImage: string;
  appIcon: string;
  siteTitle: string;
  siteDescription: string;
  keywords: string;
}

const DEFAULT_BRAND: BrandAssets = {
  logo: '',
  favicon: '',
  ogImage: '',
  appIcon: '',
  siteTitle: 'Dancehive',
  siteDescription: '지능형 라틴 댄스 이벤트 대시보드',
  keywords: '댄스하이브, dancehive, 살사, 바차타, 라틴댄스, 소셜댄스, 이벤트, 파티'
};

interface BrandContextType {
  assets: BrandAssets;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<BrandAssets>(DEFAULT_BRAND);
  const [loading, setLoading] = useState(true);

  const fetchBrandAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'brand_assets')
        .maybeSingle();

      if (error) throw error;
      if (data?.value) {
        const newAssets = { ...DEFAULT_BRAND, ...data.value };
        setAssets(newAssets);
        updateMetaTags(newAssets);
      } else {
        updateMetaTags(DEFAULT_BRAND);
      }
    } catch (err) {
      console.error('Error fetching brand assets:', err);
      updateMetaTags(DEFAULT_BRAND);
    } finally {
      setLoading(false);
    }
  };

  const updateMetaTags = (brand: BrandAssets) => {
    // Update Document Title
    document.title = brand.siteTitle;

    // Update Favicon
    if (brand.favicon) {
      const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = brand.favicon;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = brand.favicon;
        document.head.appendChild(newLink);
      }
    }

    // Update Meta Description
    if (brand.siteDescription) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', brand.siteDescription);
      }
    }

    // Update Meta Keywords
    if (brand.keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', brand.keywords);
      } else {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        metaKeywords.setAttribute('content', brand.keywords);
        document.head.appendChild(metaKeywords);
      }
    }

    // Update OG Tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', brand.siteTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', brand.siteDescription);

    if (brand.ogImage) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) ogImg.setAttribute('content', brand.ogImage);
    }
  };

  useEffect(() => {
    fetchBrandAssets();
  }, []);

  return (
    <BrandContext.Provider value={{ assets, loading, refresh: fetchBrandAssets }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
