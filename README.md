# Warehouse Management System

React/Ant Design frontend and Express/MySQL backend with inventory, inbound/outbound records, user roles, reporting and an optional Qwen data assistant.

## Local setup

Configure your own environment using warehouse-api/.env.example (copy to .env locally). Supply a unique JWT_SECRET, database credentials and an optional QWEN_API_KEY. In each package run npm install. Run `node src/init-db.js` in warehouse-api to create an empty schema, then run `node src/init-admin.js` with your own INITIAL_ADMIN_PASSWORD. Start the API and frontend using each package.json.

The release intentionally excludes original database contents, saved users, default account passwords, private API keys, reports, dependency folders and Git history. It is educational source, not a production security certification.
