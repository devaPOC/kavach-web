# API Examples

This directory contains practical examples of using the Kavach API in different programming languages and tools.

## Available Examples

### [JavaScript/TypeScript Examples](./javascript.md)
Complete examples using modern JavaScript/TypeScript with fetch API, including:
- Authentication flows
- Error handling
- Rate limit management
- Profile management
- Admin operations

### [cURL Examples](./curl.md)
Command-line examples using cURL for:
- Testing API endpoints
- Authentication workflows
- Data manipulation
- Administrative tasks

### [Postman Collection](./postman.md)
Postman collection and environment setup for:
- Interactive API testing
- Automated testing workflows
- Team collaboration
- Documentation generation

## Quick Start Examples

### Basic Authentication (JavaScript)

```javascript
// Login example
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    role: 'customer'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Login successful:', data.data.user);
} else {
  console.error('Login failed:', data.error.message);
}
```

### Basic Authentication (cURL)

```bash
# Login example
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "role": "customer"
  }'
```

## Common Patterns

### Error Handling
All examples include comprehensive error handling for:
- Validation errors
- Authentication failures
- Rate limiting
- Server errors

### Rate Limiting
Examples demonstrate how to:
- Check rate limit headers
- Handle rate limit errors
- Implement retry logic
- Show user feedback

### Authentication
Examples cover:
- Login/logout flows
- Token refresh
- Session management
- Role-based access

## Testing Guidelines

### Local Development
- Use `http://localhost:3000` as the base URL
- Ensure the development server is running
- Check environment variables are set correctly

### Production
- Use HTTPS endpoints only
- Implement proper error handling
- Follow rate limiting guidelines
- Use secure token storage

## Contributing Examples

When adding new examples:

1. **Follow Patterns**: Use consistent patterns across examples
2. **Include Error Handling**: Always include proper error handling
3. **Add Comments**: Explain complex logic and API interactions
4. **Test Thoroughly**: Verify examples work with current API version
5. **Update Documentation**: Update this README when adding new examples

## Support

If you encounter issues with any examples:

1. Check the API documentation for the latest endpoint specifications
2. Verify your environment setup
3. Review error responses for specific guidance
4. Check rate limiting if requests are failing

For additional support, refer to the main API documentation or contact the development team.