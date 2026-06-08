
import { motion } from "framer-motion";

export default function ArtistCard({ artist }) {
  return (
    <motion.div whileHover={{ y: -8 }} className="artist-card">
      <img src={artist.image} alt={artist.name} />
      <div className="artist-content">
        <h3>{artist.name}</h3>
        <p>{artist.category}</p>
        <button>View Profile</button>
      </div>
    </motion.div>
  );
}
