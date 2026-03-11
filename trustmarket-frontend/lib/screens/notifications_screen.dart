import 'package:flutter/material.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO: Fetch notifications
    final notifications = [
      {
        'title': 'Paiement reçu',
        'message': 'Vous avez reçu 1000 FCFA',
        'date': '2023-01-01',
      },
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: ListView.builder(
        itemCount: notifications.length,
        itemBuilder: (context, index) {
          final notif = notifications[index];
          return ListTile(
            title: Text(notif['title']!),
            subtitle: Text(notif['message']!),
          );
        },
      ),
    );
  }
}
