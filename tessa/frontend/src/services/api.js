/**

 * API service for communicating with the FastAPI backend

 */



const API_BASE_URL = 'http://localhost:8000/api';



class ApiService {

  constructor() {

    this.baseUrl = API_BASE_URL;

  }



  async request(endpoint, options = {}) {

    const url = `${this.baseUrl}${endpoint}`;

    

    const config = {

      headers: {

        'Content-Type': 'application/json',

        ...options.headers,

      },

      ...options,

    };



    try {

      const response = await fetch(url, config);

      

      if (!response.ok) {

        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));

        throw new Error(error.detail || `HTTP error! status: ${response.status}`);

      }



      return await response.json();

    } catch (error) {

      console.error('API request failed:', error);

      throw error;

    }

  }



  // Health check

  async healthCheck() {

    return this.request('/health');

  }



  // Send a chat message

  async sendMessage(message, sessionId = null, isTemporary = false) {

    return this.request('/chat', {

      method: 'POST',

      body: JSON.stringify({

        message,

        session_id: sessionId,

        is_temporary: isTemporary,

        generate_title: !sessionId && !isTemporary

      }),

    });

  }



  // Chat Sessions

  async getSessions() {

    return this.request('/sessions');

  }



  async getSession(sessionId) {

    return this.request(`/sessions/${sessionId}`);

  }



  async createSession(title = 'New Chat', isTemporary = false) {

    return this.request(`/sessions?title=${encodeURIComponent(title)}&is_temporary=${isTemporary}`, {

      method: 'POST',

    });

  }



  async deleteSession(sessionId) {

    return this.request(`/sessions/${sessionId}`, {

      method: 'DELETE',

    });

  }



  // Export all data

  async exportData() {

    return this.request('/data/export');

  }



  // Get conversation history

  async getConversations(limit = 50) {

    return this.request(`/conversations?limit=${limit}`);

  }



  // Get all context entries

  async getContext() {

    return this.request('/context');

  }



  // Store or update context

  async storeContext(key, value) {

    return this.request('/context', {

      method: 'POST',

      body: JSON.stringify({ key, value }),

    });

  }



  // Delete a context entry

  async deleteContext(key) {

    return this.request(`/context/${key}`, {

      method: 'DELETE',

    });

  }

}



export default new ApiService();

