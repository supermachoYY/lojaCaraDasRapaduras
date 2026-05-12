import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface StarRatingProps {
  rating: number;
  onRatingPress?: (rating: number) => void;
  readonly?: boolean;
}

export default function StarRating({ rating, onRatingPress, readonly = false }: StarRatingProps) {
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => !readonly && onRatingPress && onRatingPress(i)}
          disabled={readonly}
          style={styles.star}
        >
          <Text style={[styles.starIcon, i <= rating ? styles.starFilled : styles.starEmpty]}>
            {i <= rating ? "★" : "☆"}
          </Text>
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return <View style={styles.container}>{renderStars()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  star: {
    marginHorizontal: 4,
  },
  starIcon: {
    fontSize: 32,
  },
  starFilled: {
    color: "#FFB800",
  },
  starEmpty: {
    color: "#ddd",
  },
});