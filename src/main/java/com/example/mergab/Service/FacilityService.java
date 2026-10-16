package com.example.mergab.Service;



import com.example.mergab.Api.ApiException;
import com.example.mergab.DTO.FacilityDTO;
import com.example.mergab.Model.Facility;
import com.example.mergab.Model.Zone;
import com.example.mergab.Repository.FacilityRepository;
import com.example.mergab.Repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.example.mergab.Repository.FacilityAccessPathRepository;
import jakarta.transaction.Transactional;
import java.util.Objects;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FacilityService {

    private final FacilityRepository facilityRepository;
    private final ZoneRepository zoneRepository;
    private final FacilityAccessPathRepository accessPathRepository;


    // Get all facilities in the Expo
    public List<Facility> getAllFacilities() {
        return facilityRepository.findAll();
    }


    // Get a specific facility by its ID
    public Facility getFacilityById(Integer id) {

        Facility facility = facilityRepository.findFacilityById(id);

        if (facility == null) {
            throw new ApiException("Facility not found");
        }

        return facility;
    }


    // Get all facilities belonging to a specific zone
    public List<Facility> getFacilitiesByZone(Integer zoneId) {

        // Validate that the zone exists
        Zone zone = zoneRepository.findZoneById(zoneId);

        if (zone == null) {
            throw new ApiException("Zone not found");
        }

        return facilityRepository.findFacilitiesByZone_Id(zoneId);
    }


    // Add a new facility to an existing zone
    public void addFacility(Integer zoneId, FacilityDTO dto) {

        // Validate that the selected zone exists
        Zone zone = zoneRepository.findZoneById(zoneId);

        if (zone == null) {
            throw new ApiException("Zone not found");
        }

        // Exits must be accessible to everyone
        if ("EXIT".equals(dto.getType()) && !"BOTH".equals(dto.getGender())) {
            throw new ApiException("Exit gender must be BOTH");
        }

        // Create the facility and assign its information
        Facility facility = new Facility();

        facility.setName(dto.getName());
        facility.setType(dto.getType());
        facility.setGender(dto.getGender());

        // Geographic coordinates used to locate the facility
        facility.setLatitude(dto.getLatitude());
        facility.setLongitude(dto.getLongitude());
        // Virtual Expo map coordinates
        facility.setMapX(dto.getMapX());
        facility.setMapY(dto.getMapY());

        // Link the facility to its zone
        facility.setZone(zone);


        facilityRepository.save(facility);

        if ("PRAYER_ROOM".equals(facility.getType())) {
            zone.setHasPrayerArea(true);
            zoneRepository.save(zone);
        }
    }


    // Update an existing facility's information and coordinates
    public void updateFacility(Integer id, FacilityDTO dto) {

        // Find the facility and validate that it exists
        Facility facility = getFacilityById(id);

        boolean locationChanged = !Objects.equals(facility.getMapX(), dto.getMapX()) || !Objects.equals(facility.getMapY(), dto.getMapY());

        if (locationChanged && accessPathRepository.existsByFacility_Id(id)) {

            throw new ApiException("Remove facility access paths before changing its location");
        }


        // Exits must be accessible to everyone
        if ("EXIT".equals(dto.getType()) && !"BOTH".equals(dto.getGender())) {
            throw new ApiException("Exit gender must be BOTH");
        }

        facility.setName(dto.getName());
        facility.setType(dto.getType());
        facility.setGender(dto.getGender());
        facility.setLatitude(dto.getLatitude());
        facility.setLongitude(dto.getLongitude());
        facility.setMapX(dto.getMapX());
        facility.setMapY(dto.getMapY());


        facilityRepository.save(facility);

        Zone zone = facility.getZone();

        boolean hasPrayerRoom = facilityRepository
                .findFacilitiesByZone_Id(zone.getId())
                .stream()
                .anyMatch(f -> "PRAYER_ROOM".equals(f.getType()));

        zone.setHasPrayerArea(hasPrayerRoom);
        zoneRepository.save(zone);
    }


    // Delete a facility without deleting its parent zone

    @Transactional
    public void deleteFacility(Integer id) {

        Facility facility = getFacilityById(id);

        // Delete facility access paths first
        accessPathRepository.deleteAll(accessPathRepository.findAllByFacility_Id(id));

        // Delete facility without deleting its zone
        facilityRepository.delete(facility);

        facilityRepository.flush();

        Zone zone = facility.getZone();

        boolean hasPrayerRoom = facilityRepository
                .findFacilitiesByZone_Id(zone.getId())
                .stream()
                .anyMatch(f -> "PRAYER_ROOM".equals(f.getType()));

        zone.setHasPrayerArea(hasPrayerRoom);
        zoneRepository.save(zone);
    }



    // Find the nearest facility based on visitor location, type, and gender
    public Facility getNearestFacility(Double latitude, Double longitude, String type, String gender) {

        // Validate GPS coordinates
        // Latitude: -90 to 90
        // Longitude: -180 to 180
        if (latitude == null || longitude == null
                || !Double.isFinite(latitude)
                || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {

            throw new ApiException("Invalid location coordinates");
        }

        // Validate the requested facility type
        if (!List.of("RESTROOM", "PRAYER_ROOM", "EXIT").contains(type)) {
            throw new ApiException("Invalid facility type");
        }

        // Validate the requested gender
        if (!List.of("MALE", "FEMALE", "BOTH").contains(gender)) {
            throw new ApiException("Invalid gender");
        }

        // Include shared facilities when searching for male or female facilities
        // MALE   -> MALE, BOTH
        // FEMALE -> FEMALE, BOTH
        // BOTH   -> BOTH only
        List<String> allowedGenders = gender.equals("BOTH") ? List.of("BOTH") : List.of(gender, "BOTH");

        // Get facilities matching the requested type and allowed genders
        List<Facility> facilities = facilityRepository.findFacilitiesByTypeAndGenderIn(type, allowedGenders);

        // Search only facilities with complete GPS coordinates
        return facilities.stream()
                .filter(facility ->
                        facility.getLatitude() != null &&
                                facility.getLongitude() != null &&
                                Double.isFinite(facility.getLatitude()) &&
                                Double.isFinite(facility.getLongitude()))
                .min(Comparator.comparingDouble(
                        facility -> calculateDistance(
                                latitude,
                                longitude,
                                facility.getLatitude(),
                                facility.getLongitude()
                        )
                ))
                .orElseThrow(() -> new ApiException("No matching GPS facilities found"));
    }


    // Find the nearest facility on the virtual Expo map
    public Facility getNearestMapFacility(Double mapX, Double mapY, String type, String gender) {

        // Validate map coordinates (0–100%)
        if (mapX == null || mapY == null
                || !Double.isFinite(mapX) || !Double.isFinite(mapY)
                || mapX < 0 || mapX > 100
                || mapY < 0 || mapY > 100) {
            throw new ApiException("Invalid map coordinates");
        }

        // Validate facility type and gender
        if (!List.of("RESTROOM", "PRAYER_ROOM", "EXIT").contains(type)) {
            throw new ApiException("Invalid facility type");
        }

        if (!List.of("MALE", "FEMALE", "BOTH").contains(gender)) {
            throw new ApiException("Invalid gender");
        }

        // Include shared facilities for male and female searches
        List<String> allowedGenders = gender.equals("BOTH")
                ? List.of("BOTH")
                : List.of(gender, "BOTH");

        List<Facility> facilities = facilityRepository.findFacilitiesByTypeAndGenderIn(type, allowedGenders);

        // Find the closest facility using virtual map coordinates
        return facilities.stream()
                .filter(facility ->
                        facility.getMapX() != null &&
                                facility.getMapY() != null &&
                                Double.isFinite(facility.getMapX()) &&
                                Double.isFinite(facility.getMapY()))
                .min(Comparator.comparingDouble(facility ->
                        Math.hypot(
                                facility.getMapX() - mapX,
                                facility.getMapY() - mapY
                        )
                ))
                .orElseThrow(() -> new ApiException("No matching map facilities found"));
    }


    //helper methods


    // Calculate the straight-line distance between two GPS coordinates
    // using the Haversine formula
    // Returns the distance in meters
    private double calculateDistance(
            double lat1,
            double lon1,
            double lat2,
            double lon2) {

        // Earth's approximate radius in meters
        final double earthRadius = 6371000;

        // Convert coordinate differences from degrees to radians
        double latDifference = Math.toRadians(lat2 - lat1);
        double lonDifference = Math.toRadians(lon2 - lon1);

        // Haversine formula
        double a = Math.pow(Math.sin(latDifference / 2), 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.pow(Math.sin(lonDifference / 2), 2);

        // Calculate the angular distance
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        // Convert angular distance into meters
        return earthRadius * c;
    }
}
