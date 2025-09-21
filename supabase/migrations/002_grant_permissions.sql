-- Grant permissions to anon and authenticated roles for all tables

-- Grant SELECT permissions to anon role (for public read access)
GRANT SELECT ON users TO anon;
GRANT SELECT ON teams TO anon;
GRANT SELECT ON repositories TO anon;
GRANT SELECT ON workspaces TO anon;
GRANT SELECT ON analyses TO anon;
GRANT SELECT ON insights TO anon;
GRANT SELECT ON workflows TO anon;
GRANT SELECT ON agents TO anon;
GRANT SELECT ON executions TO anon;

-- Grant full permissions to authenticated role
GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT ALL PRIVILEGES ON teams TO authenticated;
GRANT ALL PRIVILEGES ON repositories TO authenticated;
GRANT ALL PRIVILEGES ON workspaces TO authenticated;
GRANT ALL PRIVILEGES ON analyses TO authenticated;
GRANT ALL PRIVILEGES ON insights TO authenticated;
GRANT ALL PRIVILEGES ON workflows TO authenticated;
GRANT ALL PRIVILEGES ON agents TO authenticated;
GRANT ALL PRIVILEGES ON executions TO authenticated;

-- Grant usage on sequences to authenticated role
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;