import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';

class AuthService {
  static const String baseUrl =
      'http://localhost:3000'; // Adjust to your backend URL
  static const bool useMockAuth =
      true; // Set to true for testing without backend

  Future<Map<String, dynamic>> registerStep1(
    String firstName,
    String lastName,
    String email,
    String phone,
    String password,
  ) async {
    if (useMockAuth) {
      // Mock response for testing
      await Future.delayed(const Duration(milliseconds: 500));
      return {'success': true, 'message': 'OTP sent to email'};
    }

    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'phone': phone,
        'password': password,
      }),
    );

    if (response.statusCode == 201) {
      return {'success': true, 'message': 'OTP sent to email'};
    } else {
      final data = jsonDecode(response.body);
      return {
        'success': false,
        'message': data['message'] ?? 'Registration failed',
      };
    }
  }

  Future<Map<String, dynamic>> verifyOtp(String email, String otp) async {
    if (useMockAuth) {
      // Mock response for testing
      await Future.delayed(const Duration(milliseconds: 500));
      final user = User(
        id: 1,
        firstName: 'Test',
        lastName: 'User',
        email: email,
        phone: '77000000',
        profilePicture: null,
        rating: 4.5,
        isVerified: true,
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        'token',
        'mock_token_${DateTime.now().millisecondsSinceEpoch}',
      );
      await prefs.setString('refreshToken', 'mock_refresh_token');
      await prefs.setString('user', jsonEncode(user.toJson()));
      return {'success': true, 'user': user};
    }

    final response = await http.post(
      Uri.parse('$baseUrl/auth/otp/verify'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'otp': otp}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final token = data['access_token'];
      final refreshToken = data['refresh_token'];
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      await prefs.setString('refreshToken', refreshToken);
      final user = User.fromJson(data['user']);
      await prefs.setString('user', jsonEncode(user.toJson()));
      return {'success': true, 'user': user};
    } else {
      final data = jsonDecode(response.body);
      return {
        'success': false,
        'message': data['message'] ?? 'OTP verification failed',
      };
    }
  }

  Future<Map<String, dynamic>> resendOtp(String email) async {
    if (useMockAuth) {
      await Future.delayed(const Duration(milliseconds: 500));
      return {'success': true, 'message': 'OTP resent'};
    }

    final response = await http.post(
      Uri.parse('$baseUrl/auth/otp/resend'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );

    if (response.statusCode == 200) {
      return {'success': true, 'message': 'OTP resent'};
    } else {
      final data = jsonDecode(response.body);
      return {'success': false, 'message': data['message'] ?? 'Resend failed'};
    }
  }

  Future<Map<String, dynamic>> login(String identifier, String password) async {
    if (useMockAuth) {
      // Mock response for testing - accept any credentials
      await Future.delayed(const Duration(milliseconds: 500));
      final user = User(
        id: 1,
        firstName: 'Jonathan',
        lastName: 'Kama',
        email: identifier.contains('@') ? identifier : 'jonathan@example.com',
        phone: identifier.contains('@') ? '77123456' : identifier,
        profilePicture: null,
        rating: 4.8,
        isVerified: true,
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        'token',
        'mock_token_${DateTime.now().millisecondsSinceEpoch}',
      );
      await prefs.setString('refreshToken', 'mock_refresh_token');
      await prefs.setString('user', jsonEncode(user.toJson()));
      return {'success': true, 'user': user};
    }

    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'identifier': identifier, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final token = data['access_token'];
      final refreshToken = data['refresh_token'];
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      await prefs.setString('refreshToken', refreshToken);
      final user = User.fromJson(data['user']);
      await prefs.setString('user', jsonEncode(user.toJson()));
      return {'success': true, 'user': user};
    } else {
      final data = jsonDecode(response.body);
      return {'success': false, 'message': data['message'] ?? 'Login failed'};
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    if (useMockAuth) {
      await Future.delayed(const Duration(milliseconds: 500));
      return {'success': true, 'message': 'OTP sent for password reset'};
    }

    final response = await http.post(
      Uri.parse('$baseUrl/auth/forgot-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );

    if (response.statusCode == 200) {
      return {'success': true, 'message': 'OTP sent for password reset'};
    } else {
      final data = jsonDecode(response.body);
      return {'success': false, 'message': data['message'] ?? 'Failed'};
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('refreshToken');
    await prefs.remove('user');
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('refreshToken');
  }

  Future<User?> getUser() async {
    final prefs = await SharedPreferences.getInstance();

    // Check if token exists first
    final token = prefs.getString('token');
    if (token == null) {
      return null;
    }

    final userJson = prefs.getString('user');
    if (userJson != null) {
      return User.fromJson(jsonDecode(userJson));
    }
    return null;
  }

  Future<Map<String, dynamic>> refreshToken() async {
    final refreshToken = await getRefreshToken();
    if (refreshToken == null) return {'success': false};

    final response = await http.post(
      Uri.parse('$baseUrl/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final newToken = data['access_token'];
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', newToken);
      return {'success': true, 'token': newToken};
    } else {
      return {'success': false};
    }
  }
}
