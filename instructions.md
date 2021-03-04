The package has been configured successfully.
The database configuration stored inside `config/mongodb.ts` file relies on the
following environment variables and hence we recommend validating them.

**Open the `env.ts` file and paste the following code inside the `Env.rules` object.**

```
MONGODB_CONNECTION: Env.schema.string(),
MONGODB_URL: Env.schema.string(),
MONGODB_DATABASE: Env.schema.string(),
```
