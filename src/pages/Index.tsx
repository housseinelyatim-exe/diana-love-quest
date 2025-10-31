import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to language selection on app start
    navigate("/language");
  }, [navigate]);

  return null;
};

export default Index;
