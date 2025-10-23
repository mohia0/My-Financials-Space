# Supabase Sync System

A clean, reliable sync system using official Supabase JavaScript APIs.

## Features

- ✅ **Official Supabase APIs**: Uses the official [Supabase JavaScript client](https://supabase.com/docs/reference/javascript/introduction)
- ✅ **Real-time Updates**: Live synchronization using [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- ✅ **Optimistic UI**: Instant local updates with cloud sync
- ✅ **Error Handling**: Robust error handling and fallback mechanisms
- ✅ **Clean Architecture**: Modular, maintainable code structure

## Files

- `supabase_sync.js` - Core sync manager using official Supabase APIs
- `sync_integration.js` - Integration layer connecting sync to main app
- `sync_loader.js` - Loader script for the sync system
- `README.md` - This documentation

## API Reference

### Core Functions

#### `initializeSync()`
Initialize the sync system. Call this when user signs in.

```javascript
await initializeSync();
```

#### `saveToSupabase()`
Save all local data to Supabase.

```javascript
await saveToSupabase();
```

#### `loadFromSupabase()`
Load all data from Supabase to local state.

```javascript
await loadFromSupabase();
```

#### `deleteExpense(tableName, expenseId)`
Delete an expense from Supabase.

```javascript
await deleteExpense('personal_expenses', 'expense-id');
```

#### `deleteIncomeEntry(incomeId)`
Delete an income entry from Supabase.

```javascript
await deleteIncomeEntry('income-id');
```

#### `cleanupSync()`
Cleanup the sync system. Call this when user signs out.

```javascript
await cleanupSync();
```

## Supabase Tables

The sync system works with these tables:

- `user_settings` - User preferences and settings
- `personal_expenses` - Personal expense data
- `business_expenses` - Business expense data  
- `income` - Income data

## Real-time Updates

The system automatically handles real-time updates from Supabase:

- **INSERT**: New records are added to local state
- **UPDATE**: Existing records are updated in local state
- **DELETE**: Records are removed from local state

## Integration

To integrate with your main app:

1. **Load the sync system** in your HTML:
```html
<script src="sync/sync_loader.js"></script>
```

2. **Initialize when user signs in**:
```javascript
if (window.syncSystemReady) {
  await initializeSync();
}
```

3. **Save data** when changes are made:
```javascript
await saveToSupabase();
```

4. **Load data** on app startup:
```javascript
await loadFromSupabase();
```

5. **Cleanup when user signs out**:
```javascript
await cleanupSync();
```

## Error Handling

The system includes comprehensive error handling:

- Connection failures fall back to local-only mode
- Network errors are logged and retried
- Data validation ensures consistency
- Graceful degradation when sync is unavailable

## Performance

- **Parallel Operations**: Multiple database operations run in parallel
- **Efficient Queries**: Uses Supabase's optimized query system
- **Minimal Data Transfer**: Only changed data is synchronized
- **Real-time Efficiency**: WebSocket connections for instant updates

## Browser Support

Works with all modern browsers that support:
- ES6+ JavaScript
- WebSocket connections
- Fetch API
- Promises

## Dependencies

- Supabase JavaScript client
- Modern browser with WebSocket support
- Your main application state management
