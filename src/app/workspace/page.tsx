"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  MessageCircle,
  Video,
  Share2,
  Plus,
  Settings,
  Bell,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Code,
  GitBranch,
  Activity,
  Send,
  Paperclip,
  Smile,
  MoreHorizontal,
  UserPlus,
  Crown,
  Shield,
  Eye,
  Edit,
  Trash2,
  Star,
  Pin,
  Hash
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActive: Date;
  joinedAt: Date;
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  channels: Channel[];
  projects: Project[];
  createdAt: Date;
  settings: WorkspaceSettings;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'general' | 'project' | 'private';
  members: string[];
  messages: Message[];
  isPinned: boolean;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'code' | 'system';
  attachments?: Attachment[];
  reactions?: Reaction[];
  isEdited?: boolean;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface Reaction {
  emoji: string;
  users: string[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  members: string[];
  repositories: string[];
  createdAt: Date;
  dueDate?: Date;
  progress: number;
}

interface WorkspaceSettings {
  isPublic: boolean;
  allowInvites: boolean;
  defaultRole: 'member' | 'viewer';
  notifications: {
    mentions: boolean;
    messages: boolean;
    projects: boolean;
  };
}

export default function TeamWorkspacePage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member');

  // Mock data for demonstration
  useEffect(() => {
    const mockWorkspace: Workspace = {
      id: 'workspace-1',
      name: 'ChimeraGPT Development Team',
      description: 'Collaborative workspace for ChimeraGPT platform development',
      members: [
        {
          id: 'user-1',
          name: 'Alice Johnson',
          email: 'alice@chimeragpt.com',
          avatar: '/avatars/alice.jpg',
          role: 'owner',
          status: 'online',
          lastActive: new Date(),
          joinedAt: new Date('2024-01-01')
        },
        {
          id: 'user-2',
          name: 'Bob Smith',
          email: 'bob@chimeragpt.com',
          avatar: '/avatars/bob.jpg',
          role: 'admin',
          status: 'online',
          lastActive: new Date(),
          joinedAt: new Date('2024-01-05')
        },
        {
          id: 'user-3',
          name: 'Carol Davis',
          email: 'carol@chimeragpt.com',
          role: 'member',
          status: 'away',
          lastActive: new Date(Date.now() - 30 * 60 * 1000),
          joinedAt: new Date('2024-01-10')
        },
        {
          id: 'user-4',
          name: 'David Wilson',
          email: 'david@chimeragpt.com',
          role: 'member',
          status: 'offline',
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
          joinedAt: new Date('2024-01-15')
        }
      ],
      channels: [
        {
          id: 'channel-1',
          name: 'general',
          description: 'General team discussions',
          type: 'general',
          members: ['user-1', 'user-2', 'user-3', 'user-4'],
          isPinned: true,
          unreadCount: 3,
          messages: [
            {
              id: 'msg-1',
              senderId: 'user-1',
              content: 'Welcome to the ChimeraGPT development workspace! 🎉',
              timestamp: new Date('2024-01-20T09:00:00'),
              type: 'text'
            },
            {
              id: 'msg-2',
              senderId: 'user-2',
              content: 'Great to be here! Looking forward to collaborating on this project.',
              timestamp: new Date('2024-01-20T09:15:00'),
              type: 'text'
            },
            {
              id: 'msg-3',
              senderId: 'user-3',
              content: 'I\'ve just pushed the latest updates to the analytics module. Please review when you get a chance.',
              timestamp: new Date('2024-01-20T10:30:00'),
              type: 'text'
            }
          ]
        },
        {
          id: 'channel-2',
          name: 'frontend-dev',
          description: 'Frontend development discussions',
          type: 'project',
          members: ['user-1', 'user-2', 'user-3'],
          isPinned: false,
          unreadCount: 1,
          messages: [
            {
              id: 'msg-4',
              senderId: 'user-2',
              content: 'The new dashboard components are looking great! Here\'s the latest design:',
              timestamp: new Date('2024-01-20T11:00:00'),
              type: 'text',
              attachments: [
                {
                  id: 'att-1',
                  name: 'dashboard-mockup.png',
                  type: 'image/png',
                  size: 2048576,
                  url: '/attachments/dashboard-mockup.png'
                }
              ]
            }
          ]
        },
        {
          id: 'channel-3',
          name: 'backend-api',
          description: 'Backend API development',
          type: 'project',
          members: ['user-1', 'user-4'],
          isPinned: false,
          unreadCount: 0,
          messages: [
            {
              id: 'msg-5',
              senderId: 'user-4',
              content: 'API endpoints for the new analytics features are ready for testing.',
              timestamp: new Date('2024-01-20T08:45:00'),
              type: 'text'
            }
          ]
        }
      ],
      projects: [
        {
          id: 'project-1',
          name: 'Dashboard Redesign',
          description: 'Complete redesign of the main dashboard with new analytics',
          status: 'active',
          members: ['user-1', 'user-2', 'user-3'],
          repositories: ['frontend-app', 'design-system'],
          createdAt: new Date('2024-01-15'),
          dueDate: new Date('2024-02-15'),
          progress: 65
        },
        {
          id: 'project-2',
          name: 'API Enhancement',
          description: 'Enhance backend APIs with new features and optimizations',
          status: 'active',
          members: ['user-1', 'user-4'],
          repositories: ['backend-api'],
          createdAt: new Date('2024-01-10'),
          dueDate: new Date('2024-02-01'),
          progress: 80
        }
      ],
      createdAt: new Date('2024-01-01'),
      settings: {
        isPublic: false,
        allowInvites: true,
        defaultRole: 'member',
        notifications: {
          mentions: true,
          messages: true,
          projects: true
        }
      }
    };

    setWorkspace(mockWorkspace);
    setSelectedChannel(mockWorkspace.channels[0]);
  }, []);

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedChannel || !workspace) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'user-1', // Current user
      content: newMessage,
      timestamp: new Date(),
      type: 'text'
    };

    setWorkspace(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        channels: prev.channels.map(channel => 
          channel.id === selectedChannel.id 
            ? { ...channel, messages: [...channel.messages, message] }
            : channel
        )
      };
    });

    setNewMessage('');
  };

  const inviteMember = () => {
    if (!inviteEmail.trim()) return;
    
    // Simulate sending invite
    console.log(`Inviting ${inviteEmail} as ${inviteRole}`);
    setInviteEmail('');
    setIsInviteDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'admin': return <Shield className="w-3 h-3 text-blue-500" />;
      default: return null;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-chimera-blue-50 to-chimera-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-8 h-8 animate-pulse text-chimera-blue-600 mx-auto mb-4" />
          <p className="text-chimera-blue-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-chimera-blue-50 to-chimera-teal-50">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-chimera-blue-200"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-r from-chimera-blue-600 to-chimera-teal-600 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-chimera-blue-900 to-chimera-teal-700 bg-clip-text text-transparent">
                  {workspace.name}
                </h1>
                <p className="text-sm text-chimera-blue-600">{workspace.members.length} members</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </Button>
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-to-r from-chimera-blue-600 to-chimera-teal-600">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Invite a new member to join your workspace.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email Address</label>
                      <Input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Enter email address"
                        type="email"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Role</label>
                      <Select value={inviteRole} onValueChange={(value: 'member' | 'viewer') => setInviteRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={inviteMember} disabled={!inviteEmail.trim()}>
                      Send Invite
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Channels */}
            <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-chimera-blue-900 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {workspace.channels.map((channel) => (
                  <motion.div
                    key={channel.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-2 rounded-lg cursor-pointer transition-all ${
                      selectedChannel?.id === channel.id 
                        ? 'bg-chimera-blue-100 border border-chimera-blue-300' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedChannel(channel)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {channel.isPinned && <Pin className="w-3 h-3 text-chimera-blue-500" />}
                        <span className="text-sm font-medium text-chimera-blue-900">
                          #{channel.name}
                        </span>
                      </div>
                      {channel.unreadCount > 0 && (
                        <Badge variant="secondary" className="bg-chimera-blue-600 text-white text-xs">
                          {channel.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {channel.description && (
                      <p className="text-xs text-chimera-blue-600 mt-1">{channel.description}</p>
                    )}
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-chimera-blue-900 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {workspace.members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-chimera-blue-100 text-chimera-blue-700">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        <p className="text-sm font-medium text-chimera-blue-900 truncate">
                          {member.name}
                        </p>
                        {getRoleIcon(member.role)}
                      </div>
                      <p className="text-xs text-chimera-blue-600 capitalize">{member.status}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/60 backdrop-blur-sm">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="h-full mt-4">
                <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200 h-full flex flex-col">
                  {/* Chat Header */}
                  <CardHeader className="pb-3 border-b border-chimera-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg text-chimera-blue-900">
                          #{selectedChannel?.name}
                        </CardTitle>
                        <p className="text-sm text-chimera-blue-600">
                          {selectedChannel?.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Video className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence>
                      {selectedChannel?.messages.map((message) => {
                        const sender = workspace.members.find(m => m.id === message.senderId);
                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex space-x-3"
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={sender?.avatar} />
                              <AvatarFallback className="bg-chimera-blue-100 text-chimera-blue-700">
                                {sender?.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-chimera-blue-900">
                                  {sender?.name}
                                </span>
                                <span className="text-xs text-chimera-blue-600">
                                  {formatTime(message.timestamp)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-700">
                                {message.content}
                              </div>
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {message.attachments.map((attachment) => (
                                    <div key={attachment.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                                      <Paperclip className="w-4 h-4 text-chimera-blue-500" />
                                      <span className="text-sm font-medium">{attachment.name}</span>
                                      <span className="text-xs text-gray-500">
                                        {(attachment.size / 1024 / 1024).toFixed(1)} MB
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </CardContent>

                  {/* Message Input */}
                  <div className="p-4 border-t border-chimera-blue-200">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message #${selectedChannel?.name}`}
                        className="flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      />
                      <Button variant="outline" size="sm">
                        <Smile className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-chimera-blue-600 hover:bg-chimera-blue-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="projects" className="mt-4">
                <div className="space-y-4">
                  {workspace.projects.map((project) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg text-chimera-blue-900">{project.name}</CardTitle>
                              <p className="text-sm text-chimera-blue-600">{project.description}</p>
                            </div>
                            <Badge 
                              variant={project.status === 'active' ? 'default' : 'secondary'}
                              className={project.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {project.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-chimera-blue-600">Progress</span>
                                <span className="font-medium">{project.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-chimera-blue-600 to-chimera-teal-600 h-2 rounded-full transition-all"
                                  style={{ width: `${project.progress}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-4">
                                <span className="text-chimera-blue-600">
                                  {project.members.length} members
                                </span>
                                <span className="text-chimera-blue-600">
                                  {project.repositories.length} repositories
                                </span>
                              </div>
                              {project.dueDate && (
                                <span className="text-chimera-blue-600">
                                  Due: {project.dueDate.toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" className="bg-chimera-blue-600 hover:bg-chimera-blue-700">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline">
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="files" className="mt-4">
                <Card className="bg-white/80 backdrop-blur-sm border-chimera-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-chimera-blue-900 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Shared Files
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-chimera-blue-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-chimera-blue-900 mb-2">No files shared yet</h3>
                      <p className="text-chimera-blue-600 mb-6">Share files with your team to collaborate more effectively</p>
                      <Button className="bg-gradient-to-r from-chimera-blue-600 to-chimera-teal-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Upload File
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}