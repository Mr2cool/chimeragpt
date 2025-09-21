"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Store,
  Search,
  Filter,
  Star,
  Download,
  Upload,
  Plus,
  Bot,
  Code,
  Shield,
  TestTube,
  FileText,
  Zap,
  Rocket,
  Heart,
  Eye,
  Clock,
  User,
  Tag,
  TrendingUp,
  Award,
  Verified,
  ExternalLink,
  Copy,
  Edit,
  Trash2,
  Settings
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AgentMarketplaceService from "@/services/agent-marketplace";

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  downloads: number;
  rating: number;
  reviews: number;
  price: number;
  is_free: boolean;
  is_verified: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  configuration: any;
  code_template: string;
  preview_image?: string;
  documentation_url?: string;
  github_url?: string;
}

interface AgentCollection {
  id: string;
  name: string;
  description: string;
  templates: string[];
  author: string;
  is_public: boolean;
  created_at: string;
}

interface MarketplaceStats {
  total_templates: number;
  total_downloads: number;
  total_authors: number;
  featured_templates: number;
}

const CATEGORIES = [
  'All',
  'Code Review',
  'Security',
  'Testing',
  'Documentation',
  'Performance',
  'Deployment',
  'Data Analysis',
  'AI/ML',
  'Monitoring',
  'Automation'
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'downloads', label: 'Most Downloads' },
  { value: 'name', label: 'Name A-Z' }
];

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [collections, setCollections] = useState<AgentCollection[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [marketplaceService] = useState(() => new AgentMarketplaceService());

  // Form states
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: '',
    tags: '',
    code_template: '',
    configuration: '{}',
    documentation_url: '',
    github_url: '',
    is_free: true,
    price: 0
  });

  useEffect(() => {
    loadMarketplaceData();
  }, [selectedCategory, sortBy, searchQuery]);

  const loadMarketplaceData = async () => {
    setLoading(true);
    try {
      // Load templates
      const templatesData = await marketplaceService.searchTemplates({
        query: searchQuery,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        sort_by: sortBy,
        limit: 50
      });
      setTemplates(templatesData);

      // Load collections
      const collectionsData = await marketplaceService.getCollections({ limit: 10 });
      setCollections(collectionsData);

      // Load stats
      const statsData = await marketplaceService.getMarketplaceStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
      toast.error('Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const templateData = {
        ...newTemplate,
        tags: newTemplate.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        configuration: JSON.parse(newTemplate.configuration),
        author: 'current_user' // In real app, get from auth
      };

      await marketplaceService.createTemplate(templateData);
      toast.success('Template created successfully!');
      setShowCreateDialog(false);
      setNewTemplate({
        name: '',
        description: '',
        category: '',
        tags: '',
        code_template: '',
        configuration: '{}',
        documentation_url: '',
        github_url: '',
        is_free: true,
        price: 0
      });
      loadMarketplaceData();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleInstallTemplate = async (template: AgentTemplate) => {
    try {
      await marketplaceService.installTemplate(template.id);
      toast.success(`${template.name} installed successfully!`);
      
      // Update download count
      setTemplates(prev => prev.map(t => 
        t.id === template.id 
          ? { ...t, downloads: t.downloads + 1 }
          : t
      ));
    } catch (error) {
      console.error('Error installing template:', error);
      toast.error('Failed to install template');
    }
  };

  const handleRateTemplate = async (templateId: string, rating: number) => {
    try {
      await marketplaceService.rateTemplate(templateId, rating, 'Great template!');
      toast.success('Rating submitted successfully!');
      loadMarketplaceData();
    } catch (error) {
      console.error('Error rating template:', error);
      toast.error('Failed to submit rating');
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      'Code Review': <Code className="h-4 w-4" />,
      'Security': <Shield className="h-4 w-4" />,
      'Testing': <TestTube className="h-4 w-4" />,
      'Documentation': <FileText className="h-4 w-4" />,
      'Performance': <Zap className="h-4 w-4" />,
      'Deployment': <Rocket className="h-4 w-4" />,
      'Data Analysis': <TrendingUp className="h-4 w-4" />,
      'AI/ML': <Bot className="h-4 w-4" />,
      'Monitoring': <Eye className="h-4 w-4" />,
      'Automation': <Settings className="h-4 w-4" />
    };
    return icons[category] || <Bot className="h-4 w-4" />;
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Store className="h-8 w-8 text-primary" />
                <h1 className="font-headline text-2xl font-bold text-foreground">
                  Agent Marketplace
                </h1>
              </div>
              <Badge variant="secondary" className="bg-chimera-teal-100 text-chimera-teal-800">
                {stats?.total_templates || 0} Templates
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Template
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Templates</p>
                    <p className="text-2xl font-bold">{stats.total_templates}</p>
                  </div>
                  <Bot className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Downloads</p>
                    <p className="text-2xl font-bold">{stats.total_downloads.toLocaleString()}</p>
                  </div>
                  <Download className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Authors</p>
                    <p className="text-2xl font-bold">{stats.total_authors}</p>
                  </div>
                  <User className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Featured</p>
                    <p className="text-2xl font-bold">{stats.featured_templates}</p>
                  </div>
                  <Award className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row gap-4 mb-8"
        >
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates, tags, or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(category => (
                <SelectItem key={category} value={category}>
                  <div className="flex items-center space-x-2">
                    {category !== 'All' && getCategoryIcon(category)}
                    <span>{category}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="templates" className="space-y-6">
            <TabsList>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="featured">Featured</TabsTrigger>
            </TabsList>

            {/* Templates Tab */}
            <TabsContent value="templates">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(template.category)}
                          <div>
                            <CardTitle className="text-lg flex items-center space-x-2">
                              <span>{template.name}</span>
                              {template.is_verified && (
                                <Verified className="h-4 w-4 text-blue-500" />
                              )}
                              {template.is_featured && (
                                <Award className="h-4 w-4 text-orange-500" />
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">by {template.author}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{template.rating.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Download className="h-4 w-4" />
                              <span>{template.downloads.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(template.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold">
                            {template.is_free ? (
                              <span className="text-green-600">Free</span>
                            ) : (
                              <span>${template.price}</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {template.github_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={template.github_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              onClick={() => handleInstallTemplate(template)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Install
                            </Button>
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRateTemplate(template.id, star)}
                              className="text-gray-300 hover:text-yellow-400 transition-colors"
                            >
                              <Star 
                                className={`h-4 w-4 ${
                                  star <= template.rating 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : ''
                                }`} 
                              />
                            </button>
                          ))}
                          <span className="text-sm text-muted-foreground ml-2">
                            ({template.reviews} reviews)
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search criteria or create a new template.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Collections Tab */}
            <TabsContent value="collections">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection) => (
                  <Card key={collection.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Tag className="h-5 w-5" />
                        <span>{collection.name}</span>
                      </CardTitle>
                      <CardDescription>{collection.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>by {collection.author}</span>
                          <span>{collection.templates.length} templates</span>
                        </div>
                        <Button className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Collection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Featured Tab */}
            <TabsContent value="featured">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.filter(t => t.is_featured).map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow border-orange-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(template.category)}
                          <div>
                            <CardTitle className="text-lg flex items-center space-x-2">
                              <span>{template.name}</span>
                              <Award className="h-4 w-4 text-orange-500" />
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">by {template.author}</p>
                          </div>
                        </div>
                        <Badge className="bg-orange-100 text-orange-800">Featured</Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{template.rating.toFixed(1)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Download className="h-4 w-4" />
                              <span>{template.downloads.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => handleInstallTemplate(template)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Install Featured Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a new agent template to share with the community.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Awesome Agent"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={newTemplate.category} 
                  onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c !== 'All').map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what your agent does..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={newTemplate.tags}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="automation, code-review, security"
              />
            </div>
            <div>
              <Label htmlFor="code_template">Code Template</Label>
              <Textarea
                id="code_template"
                value={newTemplate.code_template}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, code_template: e.target.value }))}
                placeholder="// Your agent code template here..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="configuration">Configuration (JSON)</Label>
              <Textarea
                id="configuration"
                value={newTemplate.configuration}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, configuration: e.target.value }))}
                placeholder='{"timeout": 30, "retries": 3}'
                rows={4}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="documentation_url">Documentation URL</Label>
                <Input
                  id="documentation_url"
                  value={newTemplate.documentation_url}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, documentation_url: e.target.value }))}
                  placeholder="https://docs.example.com"
                />
              </div>
              <div>
                <Label htmlFor="github_url">GitHub URL</Label>
                <Input
                  id="github_url"
                  value={newTemplate.github_url}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, github_url: e.target.value }))}
                  placeholder="https://github.com/user/repo"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_free"
                  checked={newTemplate.is_free}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, is_free: e.target.checked }))}
                />
                <Label htmlFor="is_free">Free Template</Label>
              </div>
              {!newTemplate.is_free && (
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newTemplate.price}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="9.99"
                    className="w-24"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Template Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Template</DialogTitle>
            <DialogDescription>
              Upload an existing agent template file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Drop your template file here</p>
              <p className="text-sm text-muted-foreground mb-4">
                Supports .json, .js, .ts files
              </p>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button>
                Upload Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}