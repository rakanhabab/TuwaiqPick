// Supabase Configuration for Tuwaiq Pick Platform
const SUPABASE_URL = "https://uidrnyzcqfvppglupbrm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZHJueXpjcWZ2cHBnbHVwYnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5Mzc2NjQsImV4cCI6MjA3MTUxMzY2NH0.AEOHzO3n4j3oEZ8WIw5_DA0NU9IOQCbsWHN8KXvaJ2s";

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database Tables
const TABLES = {
  PRODUCTS: 'products',
  BRANCHES: 'branches', 
  INVOICES: 'invoices',
  USERS: 'users',
  INVENTORY: 'inventory',
  PAYMENT_METHODS: 'payment_methods',
  TICKETS: 'tickets'
};

// Supabase Service Class
class SupabaseService {
  
  // Products
  async getProducts() {
    try {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async searchProducts(query) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getProductInventory(branchId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.INVENTORY)
        .select(`
          quantity,
          products!inner(*)
        `)
        .eq('branch_id', branchId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching product inventory:', error);
      return [];
    }
  }

  async searchProductsWithInventory(query, branchId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.INVENTORY)
        .select(`
          quantity,
          products!inner(*)
        `)
        .eq('branch_id', branchId)
        .ilike('products.name', `%${query}%`);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching products with inventory:', error);
      return [];
    }
  }

  // Branches
  async getBranches() {
    try {
      const { data, error } = await supabase
        .from(TABLES.BRANCHES)
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching branches:', error);
      return [];
    }
  }

  async getBranchById(branchId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.BRANCHES)
        .select('*')
        .eq('id', branchId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching branch:', error);
      return null;
    }
  }

  // Invoices
  async getUserInvoices(userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.INVOICES)
        .select(`
          *,
          branches!inner(name, address),
          payment_methods!inner(card_number)
        `)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user invoices:', error);
      return [];
    }
  }

  async createInvoice(invoiceData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.INVOICES)
        .insert([invoiceData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  async getInvoiceById(invoiceId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.INVOICES)
        .select(`
          *,
          branches!inner(name, address),
          payment_methods!inner(card_number, card_holder_name)
        `)
        .eq('id', invoiceId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  }

  // Users
  async getUser(userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async updateUser(userId, updates) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update(updates)
        .eq('id', userId)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  // Payment Methods
  async getUserPaymentMethods(userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PAYMENT_METHODS)
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }

  async addPaymentMethod(paymentData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PAYMENT_METHODS)
        .insert([paymentData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  // Tickets (Refunds)
  async getUserTickets(userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.TICKETS)
        .select(`
          *,
          invoices!inner(user_id)
        `)
        .eq('invoices.user_id', userId)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      return [];
    }
  }

  async createTicket(ticketData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.TICKETS)
        .insert([ticketData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }
}

// Initialize service
const supabaseService = new SupabaseService();

// Test connection function
async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('products').select('count').limit(1);
    
    if (error) {
      console.error('Supabase connection failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

// Export for global use
window.supabaseService = supabaseService;
window.supabase = supabase;
window.testSupabaseConnection = testSupabaseConnection;
