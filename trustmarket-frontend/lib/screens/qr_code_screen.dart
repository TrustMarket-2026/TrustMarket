import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

class QrCodeScreen extends StatelessWidget {
  const QrCodeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO: Get QR data from backend
    const qrData = 'Sample QR Data';

    return Scaffold(
      appBar: AppBar(title: const Text('QR Code')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            QrImageView(data: qrData, version: QrVersions.auto, size: 200.0),
            const SizedBox(height: 20),
            const Text('Montant: 1000'),
            const Text('Acheteur: John Doe'),
            const Text('Référence: REF123'),
            const Text('Expire dans: 48h'),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                // TODO: Share QR code
              },
              child: const Text('Partager le QR Code'),
            ),
            ElevatedButton(
              onPressed: () {
                // TODO: Find delivery person
              },
              child: const Text('Trouver un livreur'),
            ),
            const Text('Statut: En attente de scan'),
          ],
        ),
      ),
    );
  }
}
