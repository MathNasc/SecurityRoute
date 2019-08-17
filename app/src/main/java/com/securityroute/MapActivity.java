package com.securityroute;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationListener;
import android.net.Uri;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.AdapterView;
import android.widget.AutoCompleteTextView;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GooglePlayServicesNotAvailableException;
import com.google.android.gms.common.GooglePlayServicesRepairableException;
import com.google.android.gms.common.api.GoogleApiClient;
import com.google.android.gms.common.api.PendingResult;
import com.google.android.gms.common.api.ResultCallback;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.places.AutocompletePrediction;
import com.google.android.gms.location.places.Place;
import com.google.android.gms.location.places.PlaceBuffer;
import com.google.android.gms.location.places.Places;
import com.google.android.gms.location.places.ui.PlacePicker;
import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.OnMapReadyCallback;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.BitmapDescriptorFactory;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.LatLngBounds;
import com.google.android.gms.maps.model.Marker;
import com.google.android.gms.maps.model.MarkerOptions;
import com.google.android.gms.tasks.OnCompleteListener;

import com.securityroute.models.PlaceInfo;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class MapActivity extends AppCompatActivity implements OnMapReadyCallback,
        GoogleApiClient.OnConnectionFailedListener, LocationListener {

    @Override
    public void onConnectionFailed(@NonNull ConnectionResult connectionResult) {

    }

    @Override
    public void onMapReady(GoogleMap googleMap) {
        Toast.makeText (this , "Map is Ready" , Toast.LENGTH_SHORT).show ();
        Log.d (TAG , "onMapReady: maps is ready");
        mMap = googleMap;

        if (mLocationPermissionsGrated) {
            getDeviceLocation ();

            if (ActivityCompat.checkSelfPermission (this , Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission (this ,
                    Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                return;
            }
            mMap.setMyLocationEnabled (true);
            mMap.getUiSettings ().setMyLocationButtonEnabled (false);

            init ();
        }
    }

    private static final String TAG = "MapActivity";

    private static final String FINE_LOCATION = Manifest.permission.ACCESS_FINE_LOCATION;
    private static final String COURSE_LOCATION = Manifest.permission.ACCESS_COARSE_LOCATION;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1234;
    private static final float DEFAULT_ZOOM = 15f;
    private static final int PLACE_PICKER_REQUEST = 1;
    private static LatLngBounds LAT_LNG_BOUNDS = new LatLngBounds (
            new LatLng (-40, -168), new LatLng (71, 136));

    //widgets
    private AutoCompleteTextView mSearchText;
    private ImageView mGps, mInfo, mPlacePicker;

    // vars
    private boolean mLocationPermissionsGrated = false;
    private GoogleMap mMap;
    private FusedLocationProviderClient mFusedLocationProviderClient;
    private PlaceAutocompleteAdapter mPlaceAutocompleteAdapter;
    private GoogleApiClient mGoogleApiClient;
    private PlaceInfo mPlace;
    private Marker mMarker;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate (savedInstanceState);
        setContentView (R.layout.activity_map);
        mSearchText = (AutoCompleteTextView) findViewById (R.id.input_search);
        mGps = (ImageView) findViewById (R.id.ic_gps);
        mInfo = (ImageView) findViewById (R.id.place_info);
        mPlacePicker = (ImageView) findViewById (R.id.place_picker);

        final Button btnassalto = (Button) findViewById(R.id.btnassalto);
        btnassalto.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {

                Marker assalto = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.5289, -46.3635)).title("Assalto").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_roubo)));
                Marker assalto1 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.5398, -46.3475)).title("Assalto").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_roubo)));
                Marker assalto2 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.5502, -46.6341)).title("Assalto").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_roubo)));
                Marker assalto3 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.6949, -46.7587)).title("Assalto").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_roubo)));
                Marker assalto4 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.6685, -46.769)).title("Assalto").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_roubo)));
                Marker assalto5 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.6347, -46.7549)).title("Assalto").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_roubo)));
            }
        });

        Button btnruaestreita = (Button) findViewById(R.id.btnruaestreita);
        btnruaestreita.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {

                Marker ruaestreita = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.5498, -46.5546)).title("Rua Estreita").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_estrada)));
                Marker ruaestreita1 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.6816, -46.638)).title("Rua Estreita").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_estrada)));
                Marker ruaestreita2 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.6202, -46.4932)).title("Rua Estreita").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_estrada)));
                Marker ruaestreita3 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.4703, -46.6899)).title("Rua Estreita").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_estrada)));
            }
        });

        Button btnenchente = (Button) findViewById(R.id.btnenchente);
        btnenchente.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Marker enchente = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.5664, -46.5073)).title("Enchente").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_alagamento)));
                Marker enchente1 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.5844, -46.5492)).title("Enchente").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_alagamento)));
                Marker enchente2 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.579, -46.5798)).title("Enchente").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_alagamento)));
                Marker enchente3 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.5603, -46.5996)).title("Enchente").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_alagamento)));
                Marker enchente4 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.5532, -46.5818)).title("Enchente").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_alagamento)));
                Marker enchente5 = mMap.addMarker(
                        new MarkerOptions().position(new LatLng(-23.5531, -46.5282)).title("Enchente").icon(BitmapDescriptorFactory.fromResource(R.drawable.marker_alagamento)));
            }
        });

        Button btnligacao = (Button) findViewById(R.id.btnligacao);
        btnligacao.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {

                Uri uri = Uri.parse("tel:"+190);
                Intent intent = new Intent(Intent.ACTION_DIAL,uri);

                startActivity(intent);
            }
        });

        getLocationPermission ();
    }

    private void init() {
        Log.d (TAG , "init: initializing");

        mGoogleApiClient = new GoogleApiClient
                .Builder(this)
                .addApi(Places.GEO_DATA_API)
                .addApi(Places.PLACE_DETECTION_API)
                .enableAutoManage(this, this)
                .build();
        mSearchText.setOnItemClickListener (mAutocompleteClickListener);

        mPlaceAutocompleteAdapter = new PlaceAutocompleteAdapter (this, mGoogleApiClient,
                LAT_LNG_BOUNDS, null);

        mSearchText.setAdapter (mPlaceAutocompleteAdapter);

        mSearchText.setOnEditorActionListener (new TextView.OnEditorActionListener () {
            @Override
            public boolean onEditorAction(TextView textView, int actionId, KeyEvent keyEvent) {
                if (actionId == EditorInfo.IME_ACTION_SEARCH
                        || actionId == EditorInfo.IME_ACTION_DONE
                        || keyEvent.getAction() == KeyEvent.ACTION_DOWN
                        || keyEvent.getAction() == KeyEvent.KEYCODE_ENTER) {

                    //execute our method for searching
                    geoLocate ();
                }

                return false;
            }
        });

        mGps.setOnClickListener (new View.OnClickListener () {
            @Override
            public void onClick(View view) {
                Log.d (TAG, "onClick: clicked gps icon");
                getDeviceLocation ();
            }
        });

        mInfo.setOnClickListener (new View.OnClickListener () {
            @Override
            public void onClick(View view) {
                Log.d (TAG , "onClick: clicked place info");
                try {
                    if (mMarker.isInfoWindowShown ()) {
                         mMarker.hideInfoWindow ();
                    } else {
                        Log.d (TAG , "onClick: place info: " + mPlace.toString ());
                        mMarker.showInfoWindow ();
                    }
                }catch (NullPointerException e){
                    Log.e (TAG, "onClick: NullPointerException: " + e.getMessage ());
                }
            }
        });

        mPlacePicker.setOnClickListener (new View.OnClickListener () {
            @Override
            public void onClick(View view) {

                PlacePicker.IntentBuilder builder = new PlacePicker.IntentBuilder();

                try {
                    startActivityForResult(builder.build(MapActivity.this), PLACE_PICKER_REQUEST);
                } catch (GooglePlayServicesRepairableException e) {
                    Log.e (TAG, "onClick: GooglePlayServicesRepairableException: " + e.getMessage ());
                } catch (GooglePlayServicesNotAvailableException e) {
                    Log.e (TAG, "onClick: GooglePlayServicesNotAvailableException: " + e.getMessage ());
                }
            }
        });

        hideSoftKeyboard();
    }

    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == PLACE_PICKER_REQUEST) {
            if (resultCode == RESULT_OK) {
                Place place = PlacePicker.getPlace(this, data);

                PendingResult<PlaceBuffer> placeResult = Places.GeoDataApi
                        .getPlaceById (mGoogleApiClient, place.getId ());
                placeResult.setResultCallback (mUpdatePlaceDetailsCallback);
            }
        }
    }

    private void geoLocate(){
        Log.d (TAG, "geoLocate: geolocating");

        String searchString = mSearchText.getText ().toString ();

        Geocoder geocoder = new Geocoder (MapActivity.this);
        List<Address> list = new ArrayList<> ();
        try{
            list = geocoder.getFromLocationName (searchString, 1);
        }catch (IOException e){
            Log.e (TAG, "geoLocate: IOException" + e.getMessage () );
        }

        if (list.size ()>0){
            Address address= list.get (0);

            Log.d (TAG, "geoLocate: found a location" + address.toString ());
            //Toast.makeText (this, address.toString (), Toast.LENGTH_SHORT).show ();

            moveCamera (new LatLng (address.getLatitude (), address.getLongitude ()), DEFAULT_ZOOM,
                    address.getAddressLine (0));
        }
    }

    private void getDeviceLocation(){
        Log.d(TAG, "getDeviceLocation: getting the devices current locations");

        mFusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(this);

        try{
            if (mLocationPermissionsGrated){

                com.google.android.gms.tasks.Task<Location> location = mFusedLocationProviderClient.getLastLocation();
                location.addOnCompleteListener(new OnCompleteListener<Location>() {
                    @Override
                    public void onComplete(@NonNull com.google.android.gms.tasks.Task<Location> task) {
                         if (task.isSuccessful()){
                             Log.d(TAG, "onComplete: found location!");
                             Location currentlocation = (Location) task.getResult();

                             moveCamera(new LatLng(currentlocation.getLatitude(), currentlocation.getLongitude()),
                                     DEFAULT_ZOOM,
                                     "My Location!");

                         }else{
                             Log.d(TAG, "onComplete: current location is null");
                             Toast.makeText(MapActivity.this, "unable to get current location"
                                     , Toast.LENGTH_SHORT).show();
                         }
                    }
                });
            }
        } catch (SecurityException e){
            Log.e(TAG, "getDeviceLocation: SecurityException: " + e.getMessage() );
        }
    }

    private void moveCamera(LatLng latLng, float zoom, PlaceInfo placeInfo){
        Log.d(TAG, "moveCamera: moving the camera to: last: " + latLng.latitude + ", lng:" +latLng.longitude);
        mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(latLng, zoom));
        
        mMap.clear ();

        mMap.setInfoWindowAdapter (new CustomInfoWindowAdapter (MapActivity.this));
        
        if (placeInfo != null){
            try{
                String snippet = "Endereço: " + placeInfo.getAddress () + "\n" +
                                 "Telefone: " + placeInfo.getPhoneNumber () + "\n" +
                                 "Site: " + placeInfo.getWebsiteUri () + "\n" +
                                 "Avaliação: " + placeInfo.getRating () + "\n";

                MarkerOptions options = new MarkerOptions ()
                        .position (latLng)
                        .title (placeInfo.getName ())
                        .snippet (snippet);
                mMarker = mMap.addMarker (options);

            }catch (NullPointerException e){
                Log.e (TAG, "moveCamera: NullPointerException: " + e.getMessage ());
            }
        }else{
            mMap.addMarker (new MarkerOptions ().position (latLng));
        }

        hideSoftKeyboard();
    }
    
    private void moveCamera(LatLng latLng, float zoom, String title){
        Log.d(TAG, "moveCamera: moving the camera to: last: " + latLng.latitude + ", lng:" +latLng.longitude);
        mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(latLng, zoom));

        if (!title.equals ("My Location!")){
            MarkerOptions options = new MarkerOptions ()
                    .position (latLng)
                    .title (title);
            mMap.addMarker (options);
        }

        hideSoftKeyboard();
    }
    private void initMap(){
        Log.d(TAG, "initMap: initializing map");
        SupportMapFragment mapFragment = (SupportMapFragment) getSupportFragmentManager(). findFragmentById(R.id.map);

        mapFragment.getMapAsync(MapActivity.this);
    }

    private void getLocationPermission(){
        Log.d(TAG, "getLocationPermission: getting location permissions");
        String[] permissions = {Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION};

        if (ContextCompat.checkSelfPermission(this.getApplicationContext(),
                FINE_LOCATION) == PackageManager.PERMISSION_GRANTED){
            if (ContextCompat.checkSelfPermission(this.getApplicationContext(),
                    COURSE_LOCATION) == PackageManager.PERMISSION_GRANTED){
                mLocationPermissionsGrated = true;
                initMap();
            }else{
                ActivityCompat.requestPermissions(this,
                        permissions,
                        LOCATION_PERMISSION_REQUEST_CODE);
            }
        }else{
            ActivityCompat.requestPermissions(this,
                    permissions,
                    LOCATION_PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        Log.d(TAG, "onRequestPermissionsResult: called");
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        mLocationPermissionsGrated = false;

        switch (requestCode) {
            case LOCATION_PERMISSION_REQUEST_CODE: {
                if (grantResults.length > 0) {
                    for (int i = 0; i < grantResults.length; i++) {
                        if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
                            mLocationPermissionsGrated = false;
                            Log.d(TAG, "onRequestPermissionsResult: permission failed");
                            return;
                        }
                    }
                    Log.d(TAG, "onRequestPermissionsResult: permission granted");
                    mLocationPermissionsGrated = true;
                    //Inicia o Mapa
                    initMap();
                }
            }
        }
    }

    private void hideSoftKeyboard(){
        this.getWindow ().setSoftInputMode (WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);
    }

    /*
        --------------------------- google places API autocomplete suggestions ---------------------------
     */

    private AdapterView.OnItemClickListener mAutocompleteClickListener = new AdapterView.OnItemClickListener () {
        @Override
        public void onItemClick(AdapterView<?> adapterView , View view , int i, long l) {
            hideSoftKeyboard();

            final AutocompletePrediction item = mPlaceAutocompleteAdapter.getItem (i);
            final String placeId = item.getPlaceId ();

            PendingResult<PlaceBuffer> placeResult = Places.GeoDataApi
                    .getPlaceById (mGoogleApiClient, placeId);
            placeResult.setResultCallback (mUpdatePlaceDetailsCallback);
        }
    };
    private ResultCallback<PlaceBuffer> mUpdatePlaceDetailsCallback = new ResultCallback<PlaceBuffer> () {
        @Override
        public void onResult(@NonNull PlaceBuffer places) {
            if (!places.getStatus ().isSuccess ()){
                Log.d (TAG, "onResult: Place query did not complete successfully: " + places.getStatus ().toString ());
                places.release ();
                return;
            }
            final Place place = places.get (0);

            try{

                mPlace = new PlaceInfo ();
                mPlace.setName (place.getName ().toString ());
                Log.d(TAG, "onResult: name: " + place.getName ());
                mPlace.setAddress (place.getAddress ().toString ());
                Log.d(TAG, "onResult: address: " + place.getAddress ());
                //mPlace.setAttributions (place.getAttributions ().toString ());
                //Log.d(TAG, "onResult: attributions: " + place.getAttributions ());
                mPlace.setId (place.getId ());
                Log.d(TAG, "onResult: id: " + place.getId ());
                mPlace.setLatlng (place.getLatLng());
                Log.d(TAG, "onResult: latlng: " + place.getLatLng ());
                mPlace.setRating (place.getRating ());
                Log.d(TAG, "onResult: rating: " + place.getRating ());
                mPlace.setPhoneNumber (place.getPhoneNumber ().toString ());
                Log.d(TAG, "onResult: phone number: " + place.getPhoneNumber ());
                mPlace.setWebsiteUri (place.getWebsiteUri ());
                Log.d(TAG, "onResult: website uri: " + place.getWebsiteUri ());

                Log.d(TAG, "onResult: place: " + mPlace.toString ());
            }catch (NullPointerException e){
                Log.e (TAG, "onResult: NullPointerException: " + e.getMessage ());
            }

            moveCamera (new LatLng (place.getViewport ().getCenter ().latitude,
                    place.getViewport ().getCenter ().longitude),DEFAULT_ZOOM, mPlace);

            places.release ();
        }
    };

    @Override
    public void onLocationChanged(Location location) {

    }

    @Override
    public void onStatusChanged(String provider , int status , Bundle extras) {

    }

    @Override
    public void onProviderEnabled(String provider) {

    }

    @Override
    public void onProviderDisabled(String provider) {

    }
}