import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  User? _user;
  bool _isLoading = false;
  String? _pendingEmail;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get pendingEmail => _pendingEmail;

  Future<void> checkAuth() async {
    // Always clear stored credentials on startup to ensure login screen displays
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('refreshToken');
    await prefs.remove('user');

    _user = null;
  }

  Future<Map<String, dynamic>> registerStep1(
    String firstName,
    String lastName,
    String email,
    String phone,
    String password,
  ) async {
    _isLoading = true;
    notifyListeners();

    final result = await _authService.registerStep1(
      firstName,
      lastName,
      email,
      phone,
      password,
    );
    if (result['success']) {
      _pendingEmail = email;
    }

    _isLoading = false;
    notifyListeners();
    return result;
  }

  Future<Map<String, dynamic>> verifyOtp(String otp) async {
    if (_pendingEmail == null)
      return {'success': false, 'message': 'No pending registration'};

    _isLoading = true;
    notifyListeners();

    final result = await _authService.verifyOtp(_pendingEmail!, otp);
    if (result['success']) {
      _user = result['user'];
      _pendingEmail = null;
    }

    _isLoading = false;
    notifyListeners();
    return result;
  }

  Future<Map<String, dynamic>> resendOtp() async {
    if (_pendingEmail == null)
      return {'success': false, 'message': 'No pending registration'};

    _isLoading = true;
    notifyListeners();

    final result = await _authService.resendOtp(_pendingEmail!);

    _isLoading = false;
    notifyListeners();
    return result;
  }

  Future<Map<String, dynamic>> login(String identifier, String password) async {
    _isLoading = true;
    notifyListeners();

    final result = await _authService.login(identifier, password);
    if (result['success']) {
      _user = result['user'];
    }

    _isLoading = false;
    notifyListeners();
    return result;
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    _isLoading = true;
    notifyListeners();

    final result = await _authService.forgotPassword(email);

    _isLoading = false;
    notifyListeners();
    return result;
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _pendingEmail = null;
    notifyListeners();
  }

  Future<Map<String, dynamic>> refreshToken() async {
    return await _authService.refreshToken();
  }
}
