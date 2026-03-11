import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  // TODO: Implement profile editing, photo upload, transaction history, etc.
  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Photo de profil
            CircleAvatar(radius: 50, child: Icon(Icons.person, size: 50)),
            const SizedBox(height: 20),
            // Informations personnelles
            Text('Nom: ${user?.fullName ?? ''}'),
            Text('Email: ${user?.email ?? ''}'),
            Text('Téléphone: ${user?.phone ?? ''}'),
            const SizedBox(height: 20),
            // Boutons pour modification, historique, etc.
            ElevatedButton(
              onPressed: () {
                // TODO: Navigate to edit profile
              },
              child: const Text('Modifier le profil'),
            ),
            ElevatedButton(
              onPressed: () {
                // TODO: Navigate to transaction history
              },
              child: const Text('Historique des transactions'),
            ),
            ElevatedButton(
              onPressed: () {
                // TODO: Change password
              },
              child: const Text('Changer le mot de passe'),
            ),
          ],
        ),
      ),
    );
  }
}
