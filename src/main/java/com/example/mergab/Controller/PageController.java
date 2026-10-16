package com.example.mergab.Controller;



import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/register")
    public String register() {
        return "visitor/register";
    }

    @GetMapping("/visitor")
    public String visitorHome() {
        return "redirect:/";
    }

    @GetMapping("/visitor/map")
    public String visitorMap() {
        return "visitor/map";
    }

    @GetMapping("/visitor/events")
    public String visitorEvents() {
        return "visitor/events";
    }

    @GetMapping("/visitor/visit")
    public String visitorVisit() {
        return "visitor/visit";
    }

    @GetMapping("/visitor/account")
    public String visitorAccount() {
        return "visitor/account";
    }

    @GetMapping("/organizer/dashboard")
    public String organizerDashboard() {
        return "organizer/dashboard";
    }

    @GetMapping("/organizer/zones")
    public String organizerZones() {
        return "organizer/zones";
    }

    @GetMapping("/organizer/connections")
    public String organizerConnections() {
        return "organizer/connections";
    }

    @GetMapping("/organizer/events")
    public String organizerEvents() {
        return "organizer/events";
    }

    @GetMapping("/organizer/simulations")
    public String organizerSimulations() {
        return "organizer/simulations";
    }

    @GetMapping("/organizer/reports")
    public String organizerReports() {
        return "organizer/reports";
    }

    @GetMapping("/admin")
    public String adminDashboard() {
        return "admin/dashboard";
    }

    @GetMapping("/admin/users")
    public String adminUsers() {
        return "admin/users";
    }

    @GetMapping("/forbidden")
    public String forbidden() {
        return "forbidden";
    }

    @GetMapping("/account")
    public String account() {
        return "account";
    }

    @GetMapping("/organizer/check-in")
    public String organizerCheckIn() {
        return "organizer/check-in";
    }
}
