'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Input, 
  AutoComplete, 
  Button, 
  Tag, 
  Dropdown, 
  Space, 
  Typography,
  Divider,
  Empty,
  Spin,
  theme,
} from 'antd';
import {
  SearchOutlined,
  CloseOutlined,
  HistoryOutlined,
  FilterOutlined,
  FileTextOutlined,
  AlertOutlined,
  UserOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  StarOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/store/theme-store';

const { Text } = Typography;

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'case' | 'alert' | 'user' | 'rule' | 'page' | 'setting';
  url: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  lastAccessed?: Date;
}

interface SearchFilter {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface SearchBarProps {
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  width?: number | string;
  showFilters?: boolean;
  showHistory?: boolean;
  autoFocus?: boolean;
  onSearch?: (value: string, filters: string[]) => void;
}

// Mock data for demonstration
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    title: 'Critical Alert: High Business Loss',
    description: 'Critical alert detected in telecom sector',
    type: 'alert',
    url: '/alerts/1',
    tags: ['critical', 'business', 'telecom'],
    priority: 'critical',
    lastAccessed: new Date('2026-01-03'),
  },
  {
    id: '2',
    title: 'Case #12345: Billing Discrepancy',
    description: 'Investigation required for billing anomalies',
    type: 'case',
    url: '/cases/12345',
    tags: ['billing', 'investigation'],
    priority: 'high',
    lastAccessed: new Date('2026-01-02'),
  },
  {
    id: '3',
    title: 'John Smith - Operations Analyst',
    description: 'Senior analyst specializing in operational assurance',
    type: 'user',
    url: '/admin/users/john-smith',
    tags: ['analyst', 'operations'],
    lastAccessed: new Date('2026-01-01'),
  },
  {
    id: '4',
    title: 'Alert Rule: CDR Validation',
    description: 'Automated rule for call detail record validation',
    type: 'rule',
    url: '/alerts/rules/cdr-validation',
    tags: ['automation', 'cdr', 'validation'],
    priority: 'medium',
  },
];

const searchFilters: SearchFilter[] = [
  {
    key: 'all',
    label: 'All Results',
    icon: <SearchOutlined />,
    color: '#1890ff',
  },
  {
    key: 'case',
    label: 'Cases',
    icon: <FileTextOutlined />,
    color: '#52c41a',
  },
  {
    key: 'alert',
    label: 'Alerts',
    icon: <AlertOutlined />,
    color: '#ff4d4f',
  },
  {
    key: 'user',
    label: 'Users',
    icon: <UserOutlined />,
    color: '#722ed1',
  },
  {
    key: 'rule',
    label: 'Rules',
    icon: <SettingOutlined />,
    color: '#fa8c16',
  },
];

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search cases, alerts, users...',
  size = 'middle',
  width = 400,
  showFilters = true,
  showHistory = true,
  autoFocus = false,
  onSearch,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['all']);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const router = useRouter();
  const { token } = theme.useToken();
  const { language } = useThemeStore();

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('casetools-recent-searches');
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse recent searches:', e);
        }
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('casetools-recent-searches', JSON.stringify(updated));
    }
  }, [recentSearches]);

  // Mock search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Filter results based on query and selected filters
    const filtered = mockSearchResults.filter(result => {
      const matchesQuery = 
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description?.toLowerCase().includes(query.toLowerCase()) ||
        result.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      
      const matchesFilter = selectedFilters.includes('all') || selectedFilters.includes(result.type);
      
      return matchesQuery && matchesFilter;
    });
    
    setSearchResults(filtered);
    setIsSearching(false);
  }, [selectedFilters]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue) {
        performSearch(searchValue);
        setShowSuggestions(true);
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, performSearch]);

  // Handle search submission
  const handleSearch = (value: string) => {
    if (value.trim()) {
      saveRecentSearch(value);
      onSearch?.(value, selectedFilters);
      setShowSuggestions(false);
    }
  };

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    saveRecentSearch(searchValue);
    setShowSuggestions(false);
    router.push(result.url);
  };

  // Get type icon and color
  const getTypeDisplay = (type: SearchResult['type']) => {
    const filter = searchFilters.find(f => f.key === type);
    return filter ? { icon: filter.icon, color: filter.color } : { icon: <FileTextOutlined />, color: '#666' };
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return '#ff4d4f';
      case 'high': return '#fa8c16';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  // Filter dropdown menu
  const filterMenu = {
    items: searchFilters.map(filter => ({
      key: filter.key,
      label: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 0',
          }}
        >
          <Space>
            <span style={{ color: filter.color }}>{filter.icon}</span>
            <span>{filter.label}</span>
          </Space>
          {selectedFilters.includes(filter.key) && (
            <SearchOutlined style={{ color: token.colorPrimary }} />
          )}
        </div>
      ),
      onClick: () => {
        if (filter.key === 'all') {
          setSelectedFilters(['all']);
        } else {
          const newFilters = selectedFilters.includes(filter.key)
            ? selectedFilters.filter(f => f !== filter.key)
            : [...selectedFilters.filter(f => f !== 'all'), filter.key];
          
          setSelectedFilters(newFilters.length === 0 ? ['all'] : newFilters);
        }
      },
    })),
  };

  // Render search suggestions
  const renderSuggestions = () => {
    const hasResults = searchResults.length > 0;
    const hasRecentSearches = recentSearches.length > 0;
    const showRecent = !searchValue && hasRecentSearches && showHistory;

    if (!showSuggestions && !showRecent) return null;

    return (
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: token.colorBgElevated,
          border: `1px solid ${token.colorBorder}`,
          borderRadius: 6,
          boxShadow: token.boxShadowSecondary,
          maxHeight: 400,
          overflowY: 'auto',
          zIndex: 1000,
          marginTop: 4,
        }}
      >
        {isSearching && (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <Spin size="small" />
            <Text style={{ marginLeft: 8 }}>Searching...</Text>
          </div>
        )}

        {/* Search results */}
        {!isSearching && hasResults && (
          <div>
            <div style={{ padding: '8px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </Text>
            </div>
            {searchResults.map((result) => {
              const typeDisplay = getTypeDisplay(result.type);
              return (
                <div
                  key={result.id}
                  onClick={() => handleResultSelect(result)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = token.colorFillTertiary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ color: typeDisplay.color, fontSize: 16, marginTop: 2 }}>
                      {typeDisplay.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 14 }}>{result.title}</Text>
                        {result.priority && (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: getPriorityColor(result.priority),
                            }}
                          />
                        )}
                      </div>
                      {result.description && (
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                          {result.description}
                        </Text>
                      )}
                      {result.tags && result.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {result.tags.map(tag => (
                            <Tag key={tag} size="small" style={{ fontSize: 10 }}>
                              {tag}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No results */}
        {!isSearching && searchValue && !hasResults && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No results found"
              style={{ margin: 0 }}
            />
          </div>
        )}

        {/* Recent searches */}
        {showRecent && (
          <div>
            <div style={{ padding: '8px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Recent Searches
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRecentSearches([]);
                    localStorage.removeItem('casetools-recent-searches');
                  }}
                />
              </div>
            </div>
            {recentSearches.map((search, index) => (
              <div
                key={index}
                onClick={() => {
                  setSearchValue(search);
                  setShowSuggestions(false);
                }}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = token.colorFillTertiary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <ClockCircleOutlined style={{ color: token.colorTextTertiary }} />
                <Text>{search}</Text>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', width }}>
      <Input.Group compact>
        <AutoComplete
          value={searchValue}
          onChange={setSearchValue}
          onSelect={handleSearch}
          style={{ flex: 1 }}
          size={size}
          options={[]}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay hiding suggestions to allow clicks
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onPressEnter={() => handleSearch(searchValue)}
        />
        
        {showFilters && (
          <Dropdown menu={filterMenu} trigger={['click']} placement="bottomRight">
            <Button
              size={size}
              icon={<FilterOutlined />}
              style={{
                borderLeft: 'none',
                backgroundColor: selectedFilters.length > 1 || !selectedFilters.includes('all') 
                  ? token.colorPrimaryBg 
                  : 'transparent',
              }}
            />
          </Dropdown>
        )}
        
        <Button
          type="primary"
          size={size}
          icon={<SearchOutlined />}
          onClick={() => handleSearch(searchValue)}
          style={{ borderLeft: 'none' }}
        />
      </Input.Group>

      {/* Clear button */}
      {searchValue && (
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={() => {
            setSearchValue('');
            setSearchResults([]);
            setShowSuggestions(false);
          }}
          style={{
            position: 'absolute',
            right: showFilters ? 80 : 40,
            top: '50%',
            transform: 'translateY(-50%)',
            border: 'none',
            background: 'transparent',
          }}
        />
      )}

      {/* Suggestions dropdown */}
      {renderSuggestions()}

      {/* Active filters display */}
      {selectedFilters.length > 0 && !selectedFilters.includes('all') && (
        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {selectedFilters.map(filterId => {
            const filter = searchFilters.find(f => f.key === filterId);
            return filter ? (
              <Tag
                key={filterId}
                closable
                onClose={() => {
                  const newFilters = selectedFilters.filter(f => f !== filterId);
                  setSelectedFilters(newFilters.length === 0 ? ['all'] : newFilters);
                }}
                icon={filter.icon}
                color={filter.color}
                style={{ fontSize: 11 }}
              >
                {filter.label}
              </Tag>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};

// Global search shortcut component
export const GlobalSearchShortcut: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setVisible(true);
      }
      if (e.key === 'Escape') {
        setVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '20vh',
      }}
      onClick={() => setVisible(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 600,
          width: '90%',
        }}
      >
        <SearchBar
          autoFocus
          width="100%"
          placeholder="Search anything in CaseTools... (Ctrl+K)"
          onSearch={() => setVisible(false)}
        />
      </div>
    </div>
  );
};

export default SearchBar;
