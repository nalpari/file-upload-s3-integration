const AUTH_API_URL = "http://localhost:8080/api/auth";

interface LoginData {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

class AuthService {
  private accessToken: string | null = null;
  private loginPromise: Promise<string> | null = null;

  async login(): Promise<string> {
    // If already logging in, return the existing promise
    if (this.loginPromise) {
      return this.loginPromise;
    }

    // If already have a valid token, return it
    if (this.accessToken) {
      return this.accessToken;
    }

    // Start new login process
    this.loginPromise = this.performLogin();

    try {
      this.accessToken = await this.loginPromise;
      return this.accessToken;
    } finally {
      this.loginPromise = null;
    }
  }

  private async performLogin(): Promise<string> {
    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        loginId: "admin",
        password: "admin123",
      }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const apiResponse: ApiResponse<LoginData> = await response.json();

    if (!apiResponse.success || !apiResponse.data?.accessToken) {
      throw new Error("Invalid login response");
    }

    return apiResponse.data.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearToken(): void {
    this.accessToken = null;
  }

  async getAuthHeader(): Promise<{ Authorization: string }> {
    const token = await this.login();
    return { Authorization: `Bearer ${token}` };
  }
}

export const authService = new AuthService();
