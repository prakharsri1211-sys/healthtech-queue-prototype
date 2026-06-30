import java.sql.*;

public class DbCheck {
    public static void main(String[] args) throws Exception {
        try (Connection conn = DriverManager.getConnection("jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:5432/postgres?prepareThreshold=0", "postgres.yszokwskguagxyndtvow", "fWBrcvJi14ZRb9La")) {
            Statement stmt = conn.createStatement();
            
            // Output columns for appointment
            System.out.println("--- appointment table columns ---");
            ResultSet rs = stmt.executeQuery("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'appointment'");
            while(rs.next()) {
                System.out.println(rs.getString(1) + " : " + rs.getString(2));
            }

            // Create indexes safely
            try {
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_appointment_doctor_date ON appointment(doctor_id, date)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_appointment_patient_date ON appointment(patient_id, date)");
                System.out.println("Indexes created successfully.");
            } catch (Exception e) {
                System.err.println("Error creating indexes: " + e.getMessage());
            }
        }
    }
}
