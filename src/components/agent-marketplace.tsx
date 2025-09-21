'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Bot, 
  Download, 
  Star, 
  Search, 
  Filter, 
  Shield, 
  Code, 
  FileText, 
  TestTube, 
  Rocket, 
  Zap,
  Users,
  TrendingUp,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  tags: string[];
  version: string;
  author: string;
  icon?: string;
  featured: boolean;
  average_rating: number;
  rating_count: number;
  installation_count: number;
  created_at: string;
  updated_at: string;
}

interface InstallDialogProps {
  template: AgentTemplate;
  onInstall: (templateId: string, customName: string, customConfig: any) => void;
}

function InstallDialog({ template, onInstall }: InstallDialogProps) {
  const [customName, setCustomName] = useState(template.name);
  const [customDescription, setCustomDescription] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await onInstall(template.id, customName, {
        description: customDescription || template.description
      });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Install {template.name}</DialogTitle>
        <DialogDescription>
          Configure your agent installation
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="agent-name">Agent Name</Label>
          <Input
            id="agent-name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Enter custom name"
          />
        </div>
        <div>
          <Label htmlFor="agent-description">Custom Description (Optional)</Label>
          <Textarea
            id="agent-description"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Add custom description or leave empty to use default"
            rows={3}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" disabled={isInstalling}>
            Cancel
          </Button>
          <Button onClick={handleInstall} disabled={isInstalling || !customName.trim()}>
            {isInstalling ? 'Installing...' : 'Install Agent'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'security': return Shield;
    case 'code-review': return Code;
    case 'documentation': return FileText;
    case 'testing': return TestTube;
    case 'deployment': return Rocket;
    case 'performance': return Zap;
    default: return Bot;
  }
}

export function AgentMarketplace() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'security', label: 'Security' },
    { value: 'code-review', label: 'Code Review' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'testing', label: 'Testing' },
    { value: 'deployment', label: 'Deployment' },
    { value: 'performance', label: 'Performance' }
  ];

  const sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'recent', label: 'Recently Added' }
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterAndSortTemplates();
  }, [templates, searchQuery, selectedCategory, sortBy]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketplace');
      const data = await response.json();
      
      if (response.ok) {
        setTemplates(data.templates || []);
      } else {
        toast.error('Failed to load marketplace templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Error loading marketplace');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTemplates = () => {
    let filtered = [...templates];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Apply sorting
    switch (sortBy) {
      case 'featured':
        filtered.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return b.installation_count - a.installation_count;
        });
        break;
      case 'popular':
        filtered.sort((a, b) => b.installation_count - a.installation_count);
        break;
      case 'rating':
        filtered.sort((a, b) => b.average_rating - a.average_rating);
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredTemplates(filtered);
  };

  const handleInstallAgent = async (templateId: string, customName: string, customConfig: any) => {
    try {
      const response = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId,
          customName,
          customConfig
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Agent "${customName}" installed successfully!`);
        // Refresh templates to update installation counts
        loadTemplates();
      } else {
        toast.error(data.error || 'Failed to install agent');
      }
    } catch (error) {
      console.error('Error installing agent:', error);
      toast.error('Error installing agent');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chimera-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Marketplace</h1>
          <p className="text-gray-600 mt-2">
            Discover and install specialized agents to enhance your development workflow
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <TrendingUp className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
          <p className="text-gray-600">
            {searchQuery || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'No agents available in the marketplace yet'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template, index) => {
            const IconComponent = getCategoryIcon(template.category);
            
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-chimera-blue-100 rounded-lg">
                          <IconComponent className="h-6 w-6 text-chimera-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <p className="text-sm text-gray-600">by {template.author}</p>
                        </div>
                      </div>
                      {template.featured && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{template.average_rating.toFixed(1)}</span>
                            <span>({template.rating_count})</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Download className="h-4 w-4" />
                            <span>{template.installation_count}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>v{template.version}</span>
                        </div>
                      </div>

                      {/* Install Button */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            <Download className="h-4 w-4 mr-2" />
                            Install Agent
                          </Button>
                        </DialogTrigger>
                        <InstallDialog 
                          template={template} 
                          onInstall={handleInstallAgent}
                        />
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}