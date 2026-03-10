export type UserRole = 'admin' | 'chapter_head';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          chapter_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          chapter_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          chapter_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
        ];
      };
      site_stats: {
        Row: {
          id: string;
          projects_count: number;
          chapters_count: number;
          members_count: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projects_count?: number;
          chapters_count?: number;
          members_count?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          projects_count?: number;
          chapters_count?: number;
          members_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      contact_details: {
        Row: {
          id: string;
          email: string;
          facebook_url: string;
          mobile: string;
          location: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          facebook_url: string;
          mobile: string;
          location?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          facebook_url?: string;
          mobile?: string;
          location?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      programs: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description: string;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          description?: string;
          image_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chapters: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          chapter_head_name: string | null;
          chapter_head_contact: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          chapter_head_name?: string | null;
          chapter_head_contact?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string | null;
          chapter_head_name?: string | null;
          chapter_head_contact?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      volunteer_opportunities: {
        Row: {
          id: string;
          event_name: string;
          event_date: string;
          event_time: string | null;
          chapter_id: string;
          sdgs: string[];
          chapter_head_contact: string;
          volunteer_limit: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_name: string;
          event_date: string;
          event_time?: string | null;
          chapter_id: string;
          sdgs?: string[];
          chapter_head_contact: string;
          volunteer_limit?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_name?: string;
          event_date?: string;
          event_time?: string | null;
          chapter_id?: string;
          sdgs?: string[];
          chapter_head_contact?: string;
          volunteer_limit?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'volunteer_opportunities_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
        ];
      };
      volunteer_signups: {
        Row: {
          id: string;
          opportunity_id: string;
          email: string;
          full_name: string | null;
          source: string;
          external_response_id: string | null;
          signed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          opportunity_id: string;
          email: string;
          full_name?: string | null;
          source?: string;
          external_response_id?: string | null;
          signed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          opportunity_id?: string;
          email?: string;
          full_name?: string | null;
          source?: string;
          external_response_id?: string | null;
          signed_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'volunteer_signups_opportunity_id_fkey';
            columns: ['opportunity_id'];
            isOneToOne: false;
            referencedRelation: 'volunteer_opportunities';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TableName = keyof Database['public']['Tables'];
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

