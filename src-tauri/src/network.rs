use local_ip_address::local_ip;
use std::net::IpAddr;

pub fn get_local_ip() -> String {
    match local_ip() {
        Ok(ip) => ip.to_string(),
        Err(_) => "127.0.0.1".to_string(),
    }
}

pub fn is_private_ip(ip: &str) -> bool {
    let parsed_ip: IpAddr = match ip.parse() {
        Ok(addr) => addr,
        Err(_) => return false,
    };

    match parsed_ip {
        IpAddr::V4(ipv4) => {
            let octets = ipv4.octets();
            // 10.0.0.0/8
            if octets[0] == 10 {
                return true;
            }
            // 172.16.0.0/12
            if octets[0] == 172 && octets[1] >= 16 && octets[1] <= 31 {
                return true;
            }
            // 192.168.0.0/16
            if octets[0] == 192 && octets[1] == 168 {
                return true;
            }
            // 127.0.0.0/8
            if octets[0] == 127 {
                return true;
            }
            false
        }
        IpAddr::V6(ipv6) => {
            // ::1
            ipv6.is_loopback()
        }
    }
}
