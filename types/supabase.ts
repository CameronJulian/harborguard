export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      anpr_events: {
        Row: {
          camera_name: string | null
          confidence: number
          created_at: string
          detected_at: string
          id: string
          location: string | null
          nickname: string | null
          organization_id: string
          plate_number: string
          provider: string
          raw_response: Json
          recommended_action: string | null
          source: string | null
          status: string
          vehicle_id: string | null
          vehicle_name: string | null
          watchlist_match: boolean
        }
        Insert: {
          camera_name?: string | null
          confidence?: number
          created_at?: string
          detected_at: string
          id?: string
          location?: string | null
          nickname?: string | null
          organization_id: string
          plate_number: string
          provider?: string
          raw_response?: Json
          recommended_action?: string | null
          source?: string | null
          status?: string
          vehicle_id?: string | null
          vehicle_name?: string | null
          watchlist_match?: boolean
        }
        Update: {
          camera_name?: string | null
          confidence?: number
          created_at?: string
          detected_at?: string
          id?: string
          location?: string | null
          nickname?: string | null
          organization_id?: string
          plate_number?: string
          provider?: string
          raw_response?: Json
          recommended_action?: string | null
          source?: string | null
          status?: string
          vehicle_id?: string | null
          vehicle_name?: string | null
          watchlist_match?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "anpr_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          organization_id: string
          target: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id: string
          target?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          target?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          batch_code: string
          catch_kg: number
          created_at: string | null
          created_by: string | null
          dock_kg: number
          handler_name: string
          handler_role: string
          id: string
          location: string
          notes: string | null
          organization_id: string | null
          qr_code: string
          species: string
          status: string
          storage_kg: number
          vessel: string
        }
        Insert: {
          batch_code: string
          catch_kg: number
          created_at?: string | null
          created_by?: string | null
          dock_kg: number
          handler_name: string
          handler_role: string
          id?: string
          location: string
          notes?: string | null
          organization_id?: string | null
          qr_code: string
          species: string
          status: string
          storage_kg: number
          vessel: string
        }
        Update: {
          batch_code?: string
          catch_kg?: number
          created_at?: string | null
          created_by?: string | null
          dock_kg?: number
          handler_name?: string
          handler_role?: string
          id?: string
          location?: string
          notes?: string | null
          organization_id?: string | null
          qr_code?: string
          species?: string
          status?: string
          storage_kg?: number
          vessel?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          organization_id: string | null
          payload: Json | null
          provider: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
          provider?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          organization_id?: string | null
          payload?: Json | null
          provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cctv_events: {
        Row: {
          ai_event_count: number
          camera_name: string
          captured_at: string
          created_at: string
          id: string
          last_event: string | null
          last_frame_at: string | null
          latency_ms: number | null
          linked_vehicle: string | null
          linked_vehicle_id: string | null
          location: string | null
          motion_detected: boolean
          organization_id: string
          person_count: number
          provider: string
          raw_response: Json
          recommended_action: string | null
          recording: boolean
          status: string
          vehicle_count: number
          vendor: string | null
        }
        Insert: {
          ai_event_count?: number
          camera_name: string
          captured_at?: string
          created_at?: string
          id?: string
          last_event?: string | null
          last_frame_at?: string | null
          latency_ms?: number | null
          linked_vehicle?: string | null
          linked_vehicle_id?: string | null
          location?: string | null
          motion_detected?: boolean
          organization_id: string
          person_count?: number
          provider?: string
          raw_response?: Json
          recommended_action?: string | null
          recording?: boolean
          status?: string
          vehicle_count?: number
          vendor?: string | null
        }
        Update: {
          ai_event_count?: number
          camera_name?: string
          captured_at?: string
          created_at?: string
          id?: string
          last_event?: string | null
          last_frame_at?: string | null
          latency_ms?: number | null
          linked_vehicle?: string | null
          linked_vehicle_id?: string | null
          location?: string | null
          motion_detected?: boolean
          organization_id?: string
          person_count?: number
          provider?: string
          raw_response?: Json
          recommended_action?: string | null
          recording?: boolean
          status?: string
          vehicle_count?: number
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cctv_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      command_center_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          is_resolved: boolean
          message: string
          metadata: Json
          organization_id: string
          read_at: string | null
          read_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          title: string
          type: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          is_resolved?: boolean
          message: string
          metadata?: Json
          organization_id: string
          read_at?: string | null
          read_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          title: string
          type?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          is_resolved?: boolean
          message?: string
          metadata?: Json
          organization_id?: string
          read_at?: string | null
          read_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          title?: string
          type?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "command_center_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "command_center_notifications_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashcam_events: {
        Row: {
          ai_events: Json
          camera_name: string | null
          captured_at: string
          created_at: string
          id: string
          last_clip_at: string | null
          last_heartbeat: string | null
          latest_clip_label: string | null
          organization_id: string
          provider: string
          raw_response: Json
          recording: boolean
          status: string
          storage_used_percent: number
          vehicle_id: string | null
          vehicle_name: string | null
          vendor: string | null
        }
        Insert: {
          ai_events?: Json
          camera_name?: string | null
          captured_at?: string
          created_at?: string
          id?: string
          last_clip_at?: string | null
          last_heartbeat?: string | null
          latest_clip_label?: string | null
          organization_id: string
          provider?: string
          raw_response?: Json
          recording?: boolean
          status?: string
          storage_used_percent?: number
          vehicle_id?: string | null
          vehicle_name?: string | null
          vendor?: string | null
        }
        Update: {
          ai_events?: Json
          camera_name?: string | null
          captured_at?: string
          created_at?: string
          id?: string
          last_clip_at?: string | null
          last_heartbeat?: string | null
          latest_clip_label?: string | null
          organization_id?: string
          provider?: string
          raw_response?: Json
          recording?: boolean
          status?: string
          storage_used_percent?: number
          vehicle_id?: string | null
          vehicle_name?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashcam_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_missions: {
        Row: {
          accepted_at: string | null
          arrived_at: string | null
          assigned_at: string | null
          assigned_driver_id: string | null
          assigned_vehicle_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          destination_lat: number
          destination_lng: number
          dispatcher_id: string | null
          id: string
          incident_id: string | null
          mission_type: string
          notes: string | null
          organization_id: string
          pickup_lat: number | null
          pickup_lng: number | null
          priority: string
          route_data: Json
          status: string
        }
        Insert: {
          accepted_at?: string | null
          arrived_at?: string | null
          assigned_at?: string | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_lat: number
          destination_lng: number
          dispatcher_id?: string | null
          id?: string
          incident_id?: string | null
          mission_type?: string
          notes?: string | null
          organization_id: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          priority?: string
          route_data?: Json
          status?: string
        }
        Update: {
          accepted_at?: string | null
          arrived_at?: string | null
          assigned_at?: string | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_lat?: number
          destination_lng?: number
          dispatcher_id?: string | null
          id?: string
          incident_id?: string | null
          mission_type?: string
          notes?: string | null
          organization_id?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          priority?: string
          route_data?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_missions_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_missions_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_missions_dispatcher_id_fkey"
            columns: ["dispatcher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_missions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_missions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_rules: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          preferred_capabilities: string[]
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          preferred_capabilities?: string[]
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          preferred_capabilities?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string | null
          emergency_contact: string | null
          full_name: string
          id: string
          is_active: boolean
          license_number: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          emergency_contact?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          emergency_contact?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          license_number?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      emergency_response_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          note: string | null
          vehicle_alert_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          note?: string | null
          vehicle_alert_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          note?: string | null
          vehicle_alert_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_response_events_vehicle_alert_id_fkey"
            columns: ["vehicle_alert_id"]
            isOneToOne: false
            referencedRelation: "vehicle_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      eta_predictions: {
        Row: {
          confidence: number | null
          created_at: string | null
          estimated_arrival: string | null
          id: string
          incident_delay: number | null
          organization_id: string
          predicted_delay_minutes: number | null
          recommendation: string | null
          traffic_delay: number | null
          trip_id: string | null
          vehicle_id: string
          weather_delay: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          estimated_arrival?: string | null
          id?: string
          incident_delay?: number | null
          organization_id: string
          predicted_delay_minutes?: number | null
          recommendation?: string | null
          traffic_delay?: number | null
          trip_id?: string | null
          vehicle_id: string
          weather_delay?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          estimated_arrival?: string | null
          id?: string
          incident_delay?: number | null
          organization_id?: string
          predicted_delay_minutes?: number | null
          recommendation?: string | null
          traffic_delay?: number | null
          trip_id?: string | null
          vehicle_id?: string
          weather_delay?: number | null
        }
        Relationships: []
      }
      geofences: {
        Row: {
          center_lat: number
          center_lng: number
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          radius_meters: number
        }
        Insert: {
          center_lat: number
          center_lng: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          radius_meters: number
        }
        Update: {
          center_lat?: number
          center_lng?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          radius_meters?: number
        }
        Relationships: []
      }
      incident_command_actions: {
        Row: {
          action_type: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          incident_id: string
          note: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          incident_id: string
          note?: string | null
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          incident_id?: string
          note?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_command_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assigned_to: string | null
          batch_id: string | null
          created_at: string | null
          id: string
          incident_code: string
          organization_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string | null
          summary: string | null
          vehicle_alert_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          incident_code: string
          organization_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string | null
          summary?: string | null
          vehicle_alert_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          incident_code?: string
          organization_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
          summary?: string | null
          vehicle_alert_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_vehicle_alert_id_fkey"
            columns: ["vehicle_alert_id"]
            isOneToOne: false
            referencedRelation: "vehicle_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          invoice_url: string | null
          organization_id: string
          payfast_payment_id: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          invoice_url?: string | null
          organization_id: string
          payfast_payment_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          invoice_url?: string | null
          organization_id?: string
          payfast_payment_id?: string | null
          status?: string
        }
        Relationships: []
      }
      mission_evidence: {
        Row: {
          created_at: string
          evidence_type: string
          file_path: string | null
          file_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json
          mission_id: string
          notes: string | null
          organization_id: string
          signature_data: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          evidence_type?: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          mission_id: string
          notes?: string | null
          organization_id: string
          signature_data?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          evidence_type?: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          mission_id?: string
          notes?: string | null
          organization_id?: string
          signature_data?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_evidence_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "dispatch_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json
          mission_id: string
          organization_id: string
          sender_id: string | null
          sender_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          mission_id: string
          organization_id: string
          sender_id?: string | null
          sender_role?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          mission_id?: string
          organization_id?: string
          sender_id?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_messages_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "dispatch_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_notes: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          metadata: Json
          mission_id: string
          notes: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          mission_id: string
          notes: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          mission_id?: string
          notes?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_notes_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "dispatch_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_timeline_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: string | null
          event_type: string
          id: string
          metadata: Json
          mission_id: string
          organization_id: string
          source: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          metadata?: Json
          mission_id: string
          organization_id: string
          source?: string
          title: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          mission_id?: string
          organization_id?: string
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_timeline_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_timeline_events_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "dispatch_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_timeline_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_tracking: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          created_at: string
          heading: number | null
          id: string
          is_moving: boolean | null
          latitude: number
          longitude: number
          metadata: Json
          mission_id: string
          organization_id: string
          recorded_at: string
          speed: number | null
          vehicle_id: string | null
        }
        Insert: {
          accuracy?: number | null
          battery_level?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          is_moving?: boolean | null
          latitude: number
          longitude: number
          metadata?: Json
          mission_id: string
          organization_id: string
          recorded_at?: string
          speed?: number | null
          vehicle_id?: string | null
        }
        Update: {
          accuracy?: number | null
          battery_level?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          is_moving?: boolean | null
          latitude?: number
          longitude?: number
          metadata?: Json
          mission_id?: string
          organization_id?: string
          recorded_at?: string
          speed?: number | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_tracking_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "dispatch_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_tracking_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_email: string | null
          cancelled_at: string | null
          created_at: string | null
          first_vehicle: string | null
          fleet_size: number | null
          id: string
          name: string
          next_billing_date: string | null
          payfast_subscription_id: string | null
          payfast_token: string | null
          plan: string | null
          seats: number | null
          subscription_plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
        }
        Insert: {
          billing_email?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          first_vehicle?: string | null
          fleet_size?: number | null
          id?: string
          name: string
          next_billing_date?: string | null
          payfast_subscription_id?: string | null
          payfast_token?: string | null
          plan?: string | null
          seats?: number | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          billing_email?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          first_vehicle?: string | null
          fleet_size?: number | null
          id?: string
          name?: string
          next_billing_date?: string | null
          payfast_subscription_id?: string | null
          payfast_token?: string | null
          plan?: string | null
          seats?: number | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          organization_id: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          organization_id?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          organization_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          organization_id: string
          p256dh_key: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          organization_id: string
          p256dh_key: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          p256dh_key?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_delivery_logs: {
        Row: {
          created_at: string | null
          email: string
          end_date: string
          error_message: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          report_frequency: string
          start_date: string
          status: string
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          end_date: string
          error_message?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          report_frequency: string
          start_date: string
          status: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          end_date?: string
          error_message?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          report_frequency?: string
          start_date?: string
          status?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_delivery_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "report_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      report_subscriptions: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_enabled: boolean
          report_frequency: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_enabled?: boolean
          report_frequency?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_enabled?: boolean
          report_frequency?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      road_incidents: {
        Row: {
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          latitude: number
          longitude: number
          organization_id: string | null
          radius_meters: number | null
          severity: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude: number
          longitude: number
          organization_id?: string | null
          radius_meters?: number | null
          severity?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number
          longitude?: number
          organization_id?: string | null
          radius_meters?: number | null
          severity?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "road_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      road_risk_segment_events: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          organization_id: string
          road_risk_segment_id: string
          route_intelligence_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          organization_id: string
          road_risk_segment_id: string
          route_intelligence_id: string
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          organization_id?: string
          road_risk_segment_id?: string
          route_intelligence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "road_risk_segment_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "road_risk_segment_events_road_risk_segment_id_fkey"
            columns: ["road_risk_segment_id"]
            isOneToOne: false
            referencedRelation: "road_risk_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "road_risk_segment_events_route_intelligence_id_fkey"
            columns: ["route_intelligence_id"]
            isOneToOne: false
            referencedRelation: "route_intelligence"
            referencedColumns: ["id"]
          },
        ]
      }
      road_risk_segments: {
        Row: {
          collision_count: number
          created_at: string
          crime_count: number
          id: string
          last_event_at: string | null
          latitude: number
          longitude: number
          metadata: Json
          organization_id: string
          other_event_count: number
          radius_meters: number
          risk_score: number
          road_name: string | null
          roadblock_count: number
          route_segment: string | null
          segment_key: string
          traffic_signal_count: number
          updated_at: string
          verification_count: number
        }
        Insert: {
          collision_count?: number
          created_at?: string
          crime_count?: number
          id?: string
          last_event_at?: string | null
          latitude: number
          longitude: number
          metadata?: Json
          organization_id: string
          other_event_count?: number
          radius_meters?: number
          risk_score?: number
          road_name?: string | null
          roadblock_count?: number
          route_segment?: string | null
          segment_key: string
          traffic_signal_count?: number
          updated_at?: string
          verification_count?: number
        }
        Update: {
          collision_count?: number
          created_at?: string
          crime_count?: number
          id?: string
          last_event_at?: string | null
          latitude?: number
          longitude?: number
          metadata?: Json
          organization_id?: string
          other_event_count?: number
          radius_meters?: number
          risk_score?: number
          road_name?: string | null
          roadblock_count?: number
          route_segment?: string | null
          segment_key?: string
          traffic_signal_count?: number
          updated_at?: string
          verification_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "road_risk_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      route_assignments: {
        Row: {
          acknowledged_at: string | null
          assigned_by: string | null
          created_at: string
          id: string
          organization_id: string
          route_data: Json
          status: string
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          route_data: Json
          status?: string
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          route_data?: Json
          status?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      route_intelligence: {
        Row: {
          confidence: number | null
          created_at: string
          event_type: string
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json
          organization_id: string
          road_name: string | null
          route_segment: string | null
          severity: string | null
          source: string
          source_record_id: string | null
          traffic_risk: number | null
          updated_at: string
          verification_count: number
          verified: boolean
          weather_risk: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          event_type: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          organization_id: string
          road_name?: string | null
          route_segment?: string | null
          severity?: string | null
          source: string
          source_record_id?: string | null
          traffic_risk?: number | null
          updated_at?: string
          verification_count?: number
          verified?: boolean
          weather_risk?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          event_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          organization_id?: string
          road_name?: string | null
          route_segment?: string | null
          severity?: string | null
          source?: string
          source_record_id?: string | null
          traffic_risk?: number | null
          updated_at?: string
          verification_count?: number
          verified?: boolean
          weather_risk?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_intelligence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      route_safety_alerts: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          last_provider_confirmation_at: string | null
          latitude: number
          longitude: number
          organization_id: string | null
          provider_confidence: number
          provider_confirmation_count: number
          provider_sources: string[]
          radius_meters: number
          severity: string
          source: string | null
          status: string
          suggested_route: string | null
          title: string
          type: string
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          last_provider_confirmation_at?: string | null
          latitude: number
          longitude: number
          organization_id?: string | null
          provider_confidence?: number
          provider_confirmation_count?: number
          provider_sources?: string[]
          radius_meters?: number
          severity?: string
          source?: string | null
          status?: string
          suggested_route?: string | null
          title: string
          type: string
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          last_provider_confirmation_at?: string | null
          latitude?: number
          longitude?: number
          organization_id?: string | null
          provider_confidence?: number
          provider_confirmation_count?: number
          provider_sources?: string[]
          radius_meters?: number
          severity?: string
          source?: string | null
          status?: string
          suggested_route?: string | null
          title?: string
          type?: string
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_safety_alerts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_safety_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      route_safety_escalation_logs: {
        Row: {
          auto_escalated: boolean
          created_at: string
          duplicate_detected: boolean
          id: string
          organization_id: string
          push_sent: boolean
          response: Json | null
          risk_level: string | null
          risk_score: number | null
          route_alert_id: string | null
          trip_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          auto_escalated?: boolean
          created_at?: string
          duplicate_detected?: boolean
          id?: string
          organization_id: string
          push_sent?: boolean
          response?: Json | null
          risk_level?: string | null
          risk_score?: number | null
          route_alert_id?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          auto_escalated?: boolean
          created_at?: string
          duplicate_detected?: boolean
          id?: string
          organization_id?: string
          push_sent?: boolean
          response?: Json | null
          risk_level?: string | null
          risk_score?: number | null
          route_alert_id?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_safety_escalation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_safety_escalation_logs_vehicle_fk"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_email: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          organization_id: string
          payfast_subscription_id: string | null
          plan: string
          started_at: string | null
          status: string
          trial_ends_at: string | null
        }
        Insert: {
          billing_email?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id: string
          payfast_subscription_id?: string | null
          plan?: string
          started_at?: string | null
          status?: string
          trial_ends_at?: string | null
        }
        Update: {
          billing_email?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string
          payfast_subscription_id?: string | null
          plan?: string
          started_at?: string | null
          status?: string
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      telematics_integrations: {
        Row: {
          base_url: string | null
          created_at: string
          credential_reference: string | null
          credential_source: string
          enabled: boolean
          id: string
          metadata: Json
          organization_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          credential_reference?: string | null
          credential_source?: string
          enabled?: boolean
          id?: string
          metadata?: Json
          organization_id: string
          provider: string
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          created_at?: string
          credential_reference?: string | null
          credential_source?: string
          enabled?: boolean
          id?: string
          metadata?: Json
          organization_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telematics_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      telematics_message_receipts: {
        Row: {
          attempt_count: number
          claimed_at: string | null
          id: string
          last_failure_at: string | null
          last_failure_message: string | null
          metadata: Json
          organization_id: string
          processed_at: string | null
          processing_status: string
          provider: string
          provider_message_id: string
          received_at: string
          stream: string
        }
        Insert: {
          attempt_count?: number
          claimed_at?: string | null
          id?: string
          last_failure_at?: string | null
          last_failure_message?: string | null
          metadata?: Json
          organization_id: string
          processed_at?: string | null
          processing_status?: string
          provider: string
          provider_message_id: string
          received_at?: string
          stream: string
        }
        Update: {
          attempt_count?: number
          claimed_at?: string | null
          id?: string
          last_failure_at?: string | null
          last_failure_message?: string | null
          metadata?: Json
          organization_id?: string
          processed_at?: string | null
          processing_status?: string
          provider?: string
          provider_message_id?: string
          received_at?: string
          stream?: string
        }
        Relationships: [
          {
            foreignKeyName: "telematics_message_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      telematics_sync_state: {
        Row: {
          created_at: string
          cursor: string | null
          id: string
          last_failure_at: string | null
          last_failure_message: string | null
          last_successful_sync_at: string | null
          metadata: Json
          organization_id: string
          provider: string
          stream: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cursor?: string | null
          id?: string
          last_failure_at?: string | null
          last_failure_message?: string | null
          last_successful_sync_at?: string | null
          metadata?: Json
          organization_id: string
          provider: string
          stream: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cursor?: string | null
          id?: string
          last_failure_at?: string | null
          last_failure_message?: string | null
          last_successful_sync_at?: string | null
          metadata?: Json
          organization_id?: string
          provider?: string
          stream?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telematics_sync_state_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_alerts: {
        Row: {
          alert_type: string
          behavioral_risk: string | null
          created_at: string | null
          id: string
          intelligence_narrative: string | null
          intelligence_score: number | null
          is_resolved: boolean
          latitude: number | null
          longitude: number | null
          message: string
          organization_id: string | null
          resolution_notes: string | null
          review_outcome: string | null
          reviewed_by: string | null
          telemetry_evidence: Json | null
          resolved_at: string | null
          route_safety_alert_id: string | null
          severity: string
          trip_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          alert_type: string
          behavioral_risk?: string | null
          created_at?: string | null
          id?: string
          intelligence_narrative?: string | null
          intelligence_score?: number | null
          is_resolved?: boolean
          latitude?: number | null
          longitude?: number | null
          message: string
          organization_id?: string | null
          resolution_notes?: string | null
          review_outcome?: string | null
          reviewed_by?: string | null
          telemetry_evidence?: Json | null
          resolved_at?: string | null
          route_safety_alert_id?: string | null
          severity?: string
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          alert_type?: string
          behavioral_risk?: string | null
          created_at?: string | null
          id?: string
          intelligence_narrative?: string | null
          intelligence_score?: number | null
          is_resolved?: boolean
          latitude?: number | null
          longitude?: number | null
          message?: string
          organization_id?: string | null
          resolution_notes?: string | null
          review_outcome?: string | null
          reviewed_by?: string | null
          telemetry_evidence?: Json | null
          resolved_at?: string | null
          route_safety_alert_id?: string | null
          severity?: string
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_alerts_route_safety_alert_id_fkey"
            columns: ["route_safety_alert_id"]
            isOneToOne: false
            referencedRelation: "route_safety_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_alerts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "vehicle_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_locations: {
        Row: {
          heading: number | null
          id: string
          latitude: number
          longitude: number
          organization_id: string | null
          recorded_at: string
          source: string
          road_speed_limit_kmh: number | null
          speed_kmh: number | null
          trip_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          organization_id?: string | null
          recorded_at?: string
          source?: string
          road_speed_limit_kmh?: number | null
          speed_kmh?: number | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          organization_id?: string | null
          recorded_at?: string
          source?: string
          road_speed_limit_kmh?: number | null
          speed_kmh?: number | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_locations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "vehicle_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_locations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_stops: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          latitude: number
          longitude: number
          started_at: string
          trip_id: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          latitude: number
          longitude: number
          started_at: string
          trip_id?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          started_at?: string
          trip_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_stops_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_trips: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          cargo_description: string | null
          created_at: string | null
          destination_fishery: string
          deviation_threshold_km: number | null
          driver_id: string | null
          expected_route: Json | null
          id: string
          notes: string | null
          organization_id: string | null
          origin_port: string
          planned_arrival: string | null
          planned_departure: string | null
          status: string
          vehicle_id: string | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          cargo_description?: string | null
          created_at?: string | null
          destination_fishery: string
          deviation_threshold_km?: number | null
          driver_id?: string | null
          expected_route?: Json | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          origin_port: string
          planned_arrival?: string | null
          planned_departure?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          cargo_description?: string | null
          created_at?: string | null
          destination_fishery?: string
          deviation_threshold_km?: number | null
          driver_id?: string | null
          expected_route?: Json | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          origin_port?: string
          planned_arrival?: string | null
          planned_departure?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_trips_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string | null
          driver_id: string | null
          id: string
          is_active: boolean
          make: string | null
          model: string | null
          nickname: string | null
          organization_id: string | null
          registration_number: string
          tracker_device_id: string | null
          vehicle_type: string
        }
        Insert: {
          created_at?: string | null
          driver_id?: string | null
          id?: string
          is_active?: boolean
          make?: string | null
          model?: string | null
          nickname?: string | null
          organization_id?: string | null
          registration_number: string
          tracker_device_id?: string | null
          vehicle_type?: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string | null
          id?: string
          is_active?: boolean
          make?: string | null
          model?: string | null
          nickname?: string | null
          organization_id?: string | null
          registration_number?: string
          tracker_device_id?: string | null
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_events: {
        Row: {
          camera_name: string | null
          confidence: number
          created_at: string
          description: string | null
          detected_at: string
          event_type: string
          id: string
          image_url: string | null
          incident_id: string | null
          latitude: number | null
          location_recorded_at: string | null
          longitude: number | null
          organization_id: string
          provider: string
          raw_response: Json
          recommended_action: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          vehicle_id: string | null
          vehicle_name: string | null
        }
        Insert: {
          camera_name?: string | null
          confidence?: number
          created_at?: string
          description?: string | null
          detected_at?: string
          event_type: string
          id?: string
          image_url?: string | null
          incident_id?: string | null
          latitude?: number | null
          location_recorded_at?: string | null
          longitude?: number | null
          organization_id: string
          provider?: string
          raw_response?: Json
          recommended_action?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          vehicle_id?: string | null
          vehicle_name?: string | null
        }
        Update: {
          camera_name?: string | null
          confidence?: number
          created_at?: string
          description?: string | null
          detected_at?: string
          event_type?: string
          id?: string
          image_url?: string | null
          incident_id?: string | null
          latitude?: number | null
          location_recorded_at?: string | null
          longitude?: number | null
          organization_id?: string
          provider?: string
          raw_response?: Json
          recommended_action?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          vehicle_id?: string | null
          vehicle_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vision_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vision_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_road_risk_intelligence: {
        Args: {
          p_event_at?: string
          p_event_type: string
          p_latitude: number
          p_longitude: number
          p_organization_id: string
          p_route_intelligence_id: string
        }
        Returns: {
          event_processed: boolean
          segment_id: string
          segment_risk_score: number
        }[]
      }
      current_user_org_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
