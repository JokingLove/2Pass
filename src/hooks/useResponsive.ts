// 响应式状态管理 Hook
import { useState, useEffect } from 'react';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
}

// 断点定义
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    const width = window.innerWidth;
    return {
      isMobile: width <= BREAKPOINTS.mobile,
      isTablet: width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet,
      isDesktop: width > BREAKPOINTS.tablet,
      screenWidth: width,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width <= BREAKPOINTS.mobile,
        isTablet: width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet,
        isDesktop: width > BREAKPOINTS.tablet,
        screenWidth: width,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
};
