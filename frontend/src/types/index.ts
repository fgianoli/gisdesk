export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLIENT';
  active: boolean;
  createdAt: string;
  phone?: string | null;
  company?: string | null;
  avatar?: string | null;
  language?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  startDate: string | null;
  endDate: string | null;
  slaHours: number;
  createdAt: string;
  members?: ProjectMember[];
  _count?: { tickets: number; todos: number; faqs: number; documents: number };
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: 'MANAGER' | 'MEMBER';
  user: Pick<User, 'id' | 'name' | 'email' | 'role'>;
}

export interface Ticket {
  id: string;
  projectId: string;
  creatorId: string;
  assigneeId: string | null;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'FEATURE_REQUEST';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  type: 'STANDARD' | 'SERVICE';
  slaDeadline: string | null;
  slaStatus: 'green' | 'yellow' | 'red' | 'none';
  createdAt: string;
  updatedAt: string;
  project?: Pick<Project, 'id' | 'name'>;
  creator?: Pick<User, 'id' | 'name' | 'email'>;
  assignee?: Pick<User, 'id' | 'name' | 'email'> | null;
  comments?: TicketComment[];
  history?: TicketHistoryEntry[];
  attachments?: TicketAttachment[];
  _count?: { comments: number };
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: Pick<User, 'id' | 'name'>;
}

export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  userId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: Pick<User, 'id' | 'name'>;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  uploadedById: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  createdAt: string;
  uploadedBy: Pick<User, 'id' | 'name'>;
}

export interface TimelineItem {
  id: string;
  projectId: string;
  parentId: string | null;
  todoId: string | null;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  progress: number;
  color: string | null;
  sortOrder: number;
  todo?: { id: string; title: string; completed: boolean } | null;
  subTasks?: TimelineItem[];
}

export interface Todo {
  id: string;
  projectId: string;
  userId: string | null;
  title: string;
  completed: boolean;
  dueDate: string | null;
  recurrence: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'name'> | null;
}

export interface ProjectFaq {
  id: string;
  projectId: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  content: string;
  url?: string | null;
  createdAt: string;
}

export interface ProjectMessage {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
}

export interface ProjectAttachment {
  id: string;
  projectId: string;
  uploadedById: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  createdAt: string;
  uploadedBy: Pick<User, 'id' | 'name'>;
}

export interface TimeEntry {
  id: string;
  ticketId: string;
  userId: string;
  minutes: number;
  note: string | null;
  createdAt: string;
  user: Pick<User, 'id' | 'name'>;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
}

export interface TicketDependency {
  id: string;
  ticketId: string;
  dependsOnId: string;
  ticket: Pick<Ticket, 'id' | 'title' | 'status'>;
  dependsOn: Pick<Ticket, 'id' | 'title' | 'status'>;
}

export interface TicketTemplate {
  id: string;
  projectId: string | null;
  name: string;
  titleTemplate: string;
  descriptionTemplate: string;
  priority: Ticket['priority'];
  type: Ticket['type'];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: { id: string; name: string; email: string };
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface CustomField {
  id: string;
  projectId: string;
  name: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';
  required: boolean;
  options?: string;
  sortOrder: number;
  createdAt: string;
}

export interface CustomFieldValue {
  id: string;
  customFieldId: string;
  ticketId: string;
  value?: string;
  customField: CustomField;
  createdAt: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: string;
  createdAt: string;
}

export interface Webhook {
  id: string;
  projectId?: string;
  name: string;
  url: string;
  events: string;
  active: boolean;
  secret?: string;
  createdAt: string;
  updatedAt: string;
}
