use rand::Rng;
use std::net::TcpListener;

pub fn find_available_port() -> Option<u16> {
    let mut rng = rand::thread_rng();
    for _ in 0..10 {
        let port = rng.gen_range(1024..49151);
        if check_port_available(port) {
            return Some(port);
        }
    }
    None
}

#[allow(dead_code)]
pub fn find_port_in_range(start: u16, end: u16) -> Option<u16> {
    for port in start..=end {
        if check_port_available(port) {
            return Some(port);
        }
    }
    None
}

pub fn check_port_available(port: u16) -> bool {
    TcpListener::bind(("0.0.0.0", port)).is_ok()
}
