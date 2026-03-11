import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class TransferScreen extends StatefulWidget {
  const TransferScreen({super.key});

  @override
  State<TransferScreen> createState() => _TransferScreenState();
}

class _TransferScreenState extends State<TransferScreen> {
  final _phoneController = TextEditingController();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _receiverName;
  double _commission = 0;
  double _netAmount = 0;
  String _operator = '';

  void _calculateCommission() {
    final amount = double.tryParse(_amountController.text) ?? 0;
    _commission = amount * 0.005; // 0.5%
    _netAmount = amount - _commission;
    setState(() {});
  }

  void _detectOperator(String phone) {
    // Remove +226 if present
    String cleanPhone = phone.replaceAll('+226', '').replaceAll(' ', '');
    if (cleanPhone.startsWith('7')) {
      _operator = 'Orange Money';
    } else if (cleanPhone.startsWith('01') || cleanPhone.startsWith('76')) {
      _operator = 'Wave';
    } else {
      _operator = 'Inconnu';
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Transfert')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: _phoneController,
              decoration: const InputDecoration(
                labelText: 'Numéro de téléphone du receveur',
              ),
              onChanged: (value) {
                _detectOperator(value);
                // TODO: Verify receiver
              },
            ),
            if (_receiverName != null) Text('Receveur: $_receiverName'),
            TextField(
              controller: _amountController,
              decoration: const InputDecoration(labelText: 'Montant'),
              keyboardType: TextInputType.number,
              onChanged: (_) => _calculateCommission(),
            ),
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optionnel)',
              ),
            ),
            const SizedBox(height: 20),
            Text('Opérateur: $_operator'),
            Text('Commission: $_commission'),
            Text('Montant net: $_netAmount'),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                // Mock deep link
                final url = _operator == 'Orange Money'
                    ? 'om://transfer?amount=${_amountController.text}&recipient=${_phoneController.text}'
                    : 'wave://transfer?amount=${_amountController.text}&recipient=${_phoneController.text}';
                if (await canLaunchUrl(Uri.parse(url))) {
                  await launchUrl(Uri.parse(url));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Impossible d\'ouvrir l\'app'),
                    ),
                  );
                }
              },
              child: Text('Ouvrir l\'app $_operator'),
            ),
            ElevatedButton(
              onPressed: () {
                // TODO: Confirm payment
              },
              child: const Text('J\'ai effectué le paiement'),
            ),
          ],
        ),
      ),
    );
  }
}
