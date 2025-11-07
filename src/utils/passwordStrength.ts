// 密码强度计算工具
export interface PasswordStrength {
  score: number;
  level: 'weak' | 'medium' | 'strong';
  percentage: number;
  suggestions: string[];
}

export const calculateStrength = (password: string): PasswordStrength => {
  let score = 0;
  const suggestions: string[] = [];

  // 长度检查
  if (password.length >= 8) score++;
  else suggestions.push('至少需要 8 个字符');
  
  if (password.length >= 12) score++;
  else if (password.length >= 8) suggestions.push('建议使用 12 个字符以上');

  // 字符类型检查
  if (/[a-z]/.test(password)) score++;
  else suggestions.push('添加小写字母');

  if (/[A-Z]/.test(password)) score++;
  else suggestions.push('添加大写字母');

  if (/[0-9]/.test(password)) score++;
  else suggestions.push('添加数字');

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else suggestions.push('添加特殊符号');

  // 计算等级
  let level: 'weak' | 'medium' | 'strong';
  if (score < 3) level = 'weak';
  else if (score < 5) level = 'medium';
  else level = 'strong';

  return {
    score,
    level,
    percentage: (score / 6) * 100,
    suggestions: suggestions.slice(0, 2), // 只显示前两条建议
  };
};

export const getStrengthColor = (level: 'weak' | 'medium' | 'strong'): string => {
  switch (level) {
    case 'weak': return '#ff4444';
    case 'medium': return '#ffaa00';
    case 'strong': return '#00aa00';
  }
};

export const getStrengthLabel = (level: 'weak' | 'medium' | 'strong'): string => {
  switch (level) {
    case 'weak': return '弱';
    case 'medium': return '中等';
    case 'strong': return '强';
  }
};
