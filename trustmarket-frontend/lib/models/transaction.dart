enum TransactionStatus {
  initiated,
  fundsHeld,
  qrGenerated,
  delivered,
  completed,
  refunded,
  dispute,
}

class Transaction {
  final int id;
  final double amount;
  final double commission;
  final double netAmount;
  final String operator;
  final TransactionStatus status;
  final int senderId;
  final int receiverId;
  final String? qrCodeToken;
  final DateTime createdAt;
  final DateTime? completedAt;
  final String? description;

  Transaction({
    required this.id,
    required this.amount,
    required this.commission,
    required this.netAmount,
    required this.operator,
    required this.status,
    required this.senderId,
    required this.receiverId,
    this.qrCodeToken,
    required this.createdAt,
    this.completedAt,
    this.description,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'],
      amount: json['amount'].toDouble(),
      commission: json['commission'].toDouble(),
      netAmount: json['netAmount'].toDouble(),
      operator: json['operator'],
      status: TransactionStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => TransactionStatus.initiated,
      ),
      senderId: json['senderId'],
      receiverId: json['receiverId'],
      qrCodeToken: json['qrCodeToken'],
      createdAt: DateTime.parse(json['createdAt']),
      completedAt: json['completedAt'] != null ? DateTime.parse(json['completedAt']) : null,
      description: json['description'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'amount': amount,
      'commission': commission,
      'netAmount': netAmount,
      'operator': operator,
      'status': status.name,
      'senderId': senderId,
      'receiverId': receiverId,
      'qrCodeToken': qrCodeToken,
      'createdAt': createdAt.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'description': description,
    };
  }
}