-- Create function to increment installation count
CREATE OR REPLACE FUNCTION increment_installation_count(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE agent_templates 
  SET installation_count = COALESCE(installation_count, 0) + 1,
      updated_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate average rating
CREATE OR REPLACE FUNCTION calculate_average_rating(template_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  avg_rating DECIMAL;
BEGIN
  SELECT AVG(rating) INTO avg_rating
  FROM agent_ratings
  WHERE template_id = template_id;
  
  RETURN COALESCE(avg_rating, 0);
END;
$$ LANGUAGE plpgsql;

-- Add installation_count column to agent_templates if it doesn't exist
ALTER TABLE agent_templates 
ADD COLUMN IF NOT EXISTS installation_count INTEGER DEFAULT 0;

-- Create trigger to update average rating when ratings change
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_templates
  SET average_rating = calculate_average_rating(NEW.template_id),
      updated_at = NOW()
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rating updates
DROP TRIGGER IF EXISTS trigger_update_template_rating ON agent_ratings;
CREATE TRIGGER trigger_update_template_rating
  AFTER INSERT OR UPDATE OR DELETE ON agent_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating();

-- Add average_rating column to agent_templates if it doesn't exist
ALTER TABLE agent_templates 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.0;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_installation_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_average_rating(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_installation_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION calculate_average_rating(UUID) TO anon;