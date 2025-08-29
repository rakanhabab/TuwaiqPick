// ===== DATABASE CONNECTION =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Supabase Configuration
const SUPABASE_URL = 'https://uidrnyzcqfvppglupbrm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZHJueXpjcWZ2cHBnbHVwYnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5Mzc2NjQsImV4cCI6MjA3MTUxMzY2NH0.AEOHzO3n4j3oEZ8WIw5_DA0NU9IOQCbsWHN8KXvaJ2s'

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Test user ID for local development
const TEST_USER_ID = 'test-user-123'

// Database Service Class
class DatabaseService {
    constructor() {
        this.supabase = supabase
        this.userId = TEST_USER_ID
    }

    // ===== USERS =====
    async getCurrentUser() {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', this.userId)
            .single()
        
        if (error) {
            console.error('Error fetching user:', error)
            return null
        }
        return data
    }

    async createUser(userData) {
        const { data, error } = await this.supabase
            .from('users')
            .insert([{ id: this.userId, ...userData }])
            .select()
        
        if (error) {
            console.error('Error creating user:', error)
            return null
        }
        return data[0]
    }

    async updateUser(userData) {
        const { data, error } = await this.supabase
            .from('users')
            .update(userData)
            .eq('id', this.userId)
            .select()
        
        if (error) {
            console.error('Error updating user:', error)
            return null
        }
        return data[0]
    }

    // ===== PRODUCTS =====
    async getProducts() {
        const { data, error } = await this.supabase
            .from('products')
            .select('*')
            .order('name')
        
        if (error) {
            console.error('Error fetching products:', error)
            return []
        }
        return data
    }

    async getProductById(productId) {
        const { data, error } = await this.supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single()
        
        if (error) {
            console.error('Error fetching product:', error)
            return null
        }
        return data
    }

    // ===== BRANCHES =====
    async getBranches() {
        const { data, error } = await this.supabase
            .from('branches')
            .select('*')
            .order('name')
        
        if (error) {
            console.error('Error fetching branches:', error)
            return []
        }
        return data
    }

    // ===== INVENTORY (quantities per product) =====
    async getInventoryQuantities() {
        const { data, error } = await this.supabase
            .from('inventory')
            .select('product_id, quantity, branch_num')
        if (error) {
            console.error('Error fetching inventory quantities:', error)
            return []
        }
        return data
    }

    // Debug function to get all inventory data
    async getAllInventoryData() {
        const { data, error } = await this.supabase
            .from('inventory')
            .select('*')
        if (error) {
            console.error('Error fetching all inventory data:', error)
            return []
        }
        console.log('All inventory data from database:', data)
        return data
    }

    // ===== INVOICES =====
    async getInvoices() {
        const { data, error } = await this.supabase
            .from('invoices')
            .select(`
                *,
                branches(name, address, lat, long)
            `)
            .eq('user_id', this.userId)
            .order('timestamp', { ascending: false })
        
        if (error) {
            console.error('Error fetching invoices:', error)
            return []
        }
        return data
    }

    // New: get all invoices (no user filter) for admin dashboards
    async getAllInvoices() {
        const { data, error } = await this.supabase
            .from('invoices')
            .select(`
                *,
                branches(name, address, lat, long)
            `)
            .order('timestamp', { ascending: false })
        if (error) {
            console.error('Error fetching all invoices:', error)
            return []
        }
        return data
    }

    async createInvoice(invoiceData) {
        const { data, error } = await this.supabase
            .from('invoices')
            .insert([{
                user_id: this.userId,
                ...invoiceData,
                status: 'pending'
            }])
            .select()
        
        if (error) {
            console.error('Error creating invoice:', error)
            return null
        }
        return data[0]
    }

    async updateInvoiceStatus(invoiceId, status) {
        const { data, error } = await this.supabase
            .from('invoices')
            .update({ status })
            .eq('id', invoiceId)
            .select()
        
        if (error) {
            console.error('Error updating invoice:', error)
            return null
        }
        return data[0]
    }

    // ===== PAYMENT METHODS =====
    async getPaymentMethods() {
        const { data, error } = await this.supabase
            .from('payment_methods')
            .select('*')
            .eq('user_id', this.userId)
            .eq('is_deleted', false)
            .order('is_default', { ascending: false })
        
        if (error) {
            console.error('Error fetching payment methods:', error)
            return []
        }
        return data
    }

    async addPaymentMethod(paymentData) {
        const { data, error } = await this.supabase
            .from('payment_methods')
            .insert([{
                user_id: this.userId,
                ...paymentData,
                is_default: false,
                is_deleted: false
            }])
            .select()
        
        if (error) {
            console.error('Error adding payment method:', error)
            return null
        }
        return data[0]
    }

    async deletePaymentMethod(paymentId) {
        const { error } = await this.supabase
            .from('payment_methods')
            .update({ is_deleted: true })
            .eq('id', paymentId)
        
        if (error) {
            console.error('Error deleting payment method:', error)
            return false
        }
        return true
    }

    // ===== TICKETS =====
    async getTickets() {
        const { data, error } = await this.supabase
            .from('tickets')
            .select('*')
            .order('timestamp', { ascending: false })
        
        if (error) {
            console.error('Error fetching tickets:', error)
            return []
        }
        return data
    }

    async getTicketById(ticketId) {
        const { data, error } = await this.supabase
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .single()
        
        if (error) {
            console.error('Error fetching ticket:', error)
            return null
        }
        return data
    }

    async updateTicketStatus(ticketId, status) {
        const { data, error } = await this.supabase
            .from('tickets')
            .update({ status })
            .eq('id', ticketId)
            .select()
            .single()
        
        if (error) {
            console.error('Error updating ticket status:', error)
            return null
        }
        return data
    }

    async createTicket(ticketData) {
        const { data, error } = await this.supabase
            .from('tickets')
            .insert([{
                ...ticketData,
                status: 'pending'
            }])
            .select()
        
        if (error) {
            console.error('Error creating ticket:', error)
            return null
        }
        return data[0]
    }

    // ===== UTILITY FUNCTIONS =====
    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR'
        }).format(amount)
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }



    // ===== ADDITIONAL METHODS =====
    async getInvoiceById(invoiceId) {
        const { data, error } = await this.supabase
            .from('invoices')
            .select('*')
            .eq('id', invoiceId)
            .single()
        
        if (error) {
            console.error('Error fetching invoice:', error)
            return null
        }
        return data
    }
}

// Create and export database instance
const db = new DatabaseService()

// Export for use in other files
export { db, supabase }
