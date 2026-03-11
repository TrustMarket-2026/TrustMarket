import 'package:flutter/material.dart';

class TransactionHistoryScreen extends StatelessWidget {
  const TransactionHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO: Fetch transactions from backend
    final transactions = [
      {'id': '1', 'amount': 1000, 'status': 'Complète', 'date': '2023-01-01'},
      // Add more
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Historique des Transactions')),
      body: ListView.builder(
        itemCount: transactions.length,
        itemBuilder: (context, index) {
          final tx = transactions[index];
          return ListTile(
            title: Text('Transaction ${tx['id']}'),
            subtitle: Text('Montant: ${tx['amount']}, Statut: ${tx['status']}'),
            onTap: () {
              // TODO: Show details
            },
          );
        },
      ),
    );
  }
}
