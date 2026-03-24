pub struct PatternScanner;

impl PatternScanner {
    /// Searches for a byte pattern in a byte array with support for wildcards.
    /// Wildcards are represented as `None` in the pattern.
    pub fn find_pattern(data: &[u8], pattern: &[Option<u8>]) -> Option<usize> {
        if pattern.is_empty() || data.len() < pattern.len() {
            return None;
        }

        data.windows(pattern.len()).position(|window| {
            window
                .iter()
                .zip(pattern.iter())
                .all(|(byte, pat)| pat.is_none_or(|p| p == *byte))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_pattern_wildcards() {
        let data = vec![0x00, 0x11, 0x22, 0x33, 0x44, 0x55];
        // 22 ?? 44
        let pattern = vec![Some(0x22), None, Some(0x44)];
        assert_eq!(PatternScanner::find_pattern(&data, &pattern), Some(2));
    }

    #[test]
    fn test_find_pattern_basic() {
        let data = vec![0x00, 0x11, 0x22, 0x33, 0x44, 0x55];
        let pattern = vec![Some(0x22), Some(0x33), Some(0x44)];
        assert_eq!(PatternScanner::find_pattern(&data, &pattern), Some(2));
    }

    #[test]
    fn test_find_pattern_not_found() {
        let data = vec![0x00, 0x11, 0x22];
        let pattern = vec![Some(0x33), Some(0x44)];
        assert_eq!(PatternScanner::find_pattern(&data, &pattern), None);
    }

    #[test]
    fn test_find_pattern_empty() {
        let data = vec![0x00];
        let pattern = vec![];
        assert_eq!(PatternScanner::find_pattern(&data, &pattern), None);
    }
}
