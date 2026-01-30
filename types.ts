
export enum TemplateType {
  VALENTINE = 'valentine',
  MODERN_EVENT = 'modern_event',
  BIBLICAL_SPIRITUAL = 'biblical_spiritual',
  CORPORATE = 'corporate'
}

export interface PriceOption {
  id: string;
  label: string;
  price: number;
}

export interface RegistrationConfig {
  id: string;
  title: string;
  description: string;
  logoUrl?: string; // Base64 or URL for the event logo
  price: number; // Base price if no priceOptions are provided
  priceOptions: PriceOption[];
  foodOptions: string[];
  includeAllergies: boolean;
  cashAppTag: string;
  template: TemplateType;
  fields: FormField[];
  biblicalScript?: string;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'date' | 'checkbox' | 'textarea';
  required: boolean;
  options?: string[];
}

export interface Submission {
  id: string;
  configId: string;
  data: Record<string, any>;
  selectedEntryType?: string;
  selectedFood?: string;
  allergies?: string;
  totalPaid: number;
  timestamp: number;
  paid: boolean;
}
