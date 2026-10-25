import { useEffect, useState } from "react";
import { ordersApi } from "../api/client";

export default function DeliveryProofImage({ orderId }) {
  const [imageUrl, setImageUrl] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setImageUrl("");
    setUnavailable(false);
    ordersApi.deliveryProofPhoto(orderId)
      .then(({ data }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        setImageUrl(objectUrl);
      })
      .catch(() => { if (active) setUnavailable(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orderId]);

  if (unavailable) return <p className="delivery-proof-unavailable">Proof photo is currently unavailable.</p>;
  if (!imageUrl) return <p className="delivery-proof-unavailable" role="status">Loading proof photo…</p>;
  return <img className="delivery-proof-image" src={imageUrl} alt={`Proof of delivery for order #${orderId}`} loading="lazy" />;
}
