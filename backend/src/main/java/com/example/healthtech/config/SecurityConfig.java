package com.example.healthtech.config;

import com.example.healthtech.service.CustomUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(CustomUserDetailsService userDetailsService, JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((req, res, authEx) -> {
                        res.setContentType("application/json");
                        res.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                        res.getWriter().write("{\"error\":\"Unauthorized\"}");
                    })
                )
                .sessionManagement(session -> session.sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/**").access((authentication, context) -> {
                            org.springframework.security.web.util.matcher.IpAddressMatcher local4 = 
                                new org.springframework.security.web.util.matcher.IpAddressMatcher("127.0.0.1");
                            org.springframework.security.web.util.matcher.IpAddressMatcher local6 = 
                                new org.springframework.security.web.util.matcher.IpAddressMatcher("::1");
                            boolean isLocal = local4.matches(context.getRequest()) || local6.matches(context.getRequest());
                            return new org.springframework.security.authorization.AuthorizationDecision(isLocal);
                        })
                        .requestMatchers(
                                "/",
                                "/api/auth/**",
                                "/api/public/**",
                                "/api/seed/**",
                                "/api/db-status",
                                "/api/specialties/**",
                                "/api/admin/**",
                                "/api/status",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/ws-queue/**",
                                "/error",
                                // Availability endpoints should be public for prototype visibility/saves
                                "/api/availability",
                                "/api/availability/**",
                                // Mediator login must be public (no token yet)
                                "/api/mediator/login",
                                // Account login and verification (Aadhaar flow)
                                "/api/appointments/preview",
                                "/api/appointments/available-slots",
                                "/api/doctor/*/clinic-details",
                                "/api/accounts/login",
                                "/api/accounts/verify/**",
                                "/api/accounts/profile",
                                "/api/debug/**",
                                "/api/telemetry/**",
                                "/api/mediator/*/session-info"
                        ).permitAll()
                        .requestMatchers("/api/doctor/**").hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers("/api/management/**", "/api/appointments/**").authenticated()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration c = new org.springframework.web.cors.CorsConfiguration();
        c.setAllowedOrigins(java.util.List.of("https://online-queue-frontend.onrender.com","http://localhost:5173","http://localhost:3000"));
        c.setAllowedMethods(java.util.List.of("GET","POST","PUT","DELETE","OPTIONS"));
        c.setAllowedHeaders(java.util.List.of("*"));
        c.setAllowCredentials(true);
        c.setMaxAge(3600L);
        org.springframework.web.cors.UrlBasedCorsConfigurationSource s = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        s.registerCorsConfiguration("/**", c);
        return s;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
}
