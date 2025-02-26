// routes/transactionRoutes.js
import express from 'express';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  deleteTransaction,
} from '../controllers/transactionController.js';

const router = express.Router();

// Create a new transaction for the authenticated user
router.post('/', createTransaction);

// Get all transactions for the authenticated user
router.get('/', getTransactions);

// Get a single transaction by its ID (ensuring it belongs to the authenticated user)
router.get('/:id', getTransactionById);

// Delete a transaction (if business logic permits, ensuring ownership)
router.delete('/:id', deleteTransaction);

export default router;
